package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.Server;
import com.hypernode.provisioner.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class SshConnectivityService {

    private final ServerRepository serverRepository;
    private final PasswordEncodingService passwordEncodingService;
    private final SshKeyProfileService sshKeyProfileService;

    private static final int CONNECT_TIMEOUT_SECONDS = 10;

    /**
     * 测试 SSH 连通性（用于已保存的服务器）
     */
    public Map<String, Object> testConnection(String serverId) {
        Server server = serverRepository.findById(serverId)
            .orElseThrow(() -> new RuntimeException("Server not found: " + serverId));

        String privateKey = resolvePrivateKey(server);

        Map<String, Object> result = doSshTest(
            server.getIpAddress(), server.getSshPort(), server.getUsername(), privateKey);

        String status = Boolean.TRUE.equals(result.get("reachable")) ? "ONLINE" : "OFFLINE";
        server.setConnectStatus(status);
        server.setLastCheckAt(LocalDateTime.now());
        serverRepository.save(server);

        result.put("connectStatus", status);
        return result;
    }

    /**
     * 预测试连通性（新建服务器前调用，不需要服务器存在于数据库中）
     */
    public Map<String, Object> testConnectionPreCreate(
            String ipAddress, int sshPort, String username, String privateKey) {
        return doSshTest(ipAddress, sshPort, username, privateKey);
    }

    /**
     * 通过 SSH 采集远程系统规格
     */
    public Map<String, Object> collectSystemSpecs(String serverId) {
        Server server = serverRepository.findById(serverId)
            .orElseThrow(() -> new RuntimeException("Server not found: " + serverId));

        String privateKey = resolvePrivateKey(server);

        Map<String, Object> specs = doCollectSpecs(
            server.getIpAddress(), server.getSshPort(), server.getUsername(), privateKey);

        if (!specs.containsKey("error")) {
            server.setSystemSpecs(toJson(specs));
            server.setLastCheckAt(LocalDateTime.now());
            serverRepository.save(server);
        }

        return specs;
    }

    private String resolvePrivateKey(Server server) {
        if (server.getSshKeyProfileId() != null && !server.getSshKeyProfileId().isBlank()) {
            try {
                return sshKeyProfileService.getDecryptedKey(server.getSshKeyProfileId());
            } catch (Exception e) {
                log.warn("Failed to resolve key from profile {}: {}", server.getSshKeyProfileId(), e.getMessage());
            }
        }
        if (server.getPrivateKeyEncrypted() != null) {
            return passwordEncodingService.decryptPrivateKey(server.getPrivateKeyEncrypted());
        }
        return null;
    }

    private Map<String, Object> doSshTest(String ip, Integer port, String username, String privateKey) {
        Map<String, Object> result = new HashMap<>();
        result.put("ip", ip);
        result.put("timestamp", System.currentTimeMillis());

        Path keyFile = null;
        try {
            keyFile = writeTempKey(privateKey);
            String sshCmd = buildSshCommand(ip, port, username, keyFile, "echo __HYPERNODE_OK__");

            ProcessBuilder pb = new ProcessBuilder("bash", "-c", sshCmd);
            pb.redirectErrorStream(true);
            Process proc = pb.start();

            StringBuilder output = new StringBuilder();
            try (var reader = new BufferedReader(new InputStreamReader(proc.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean finished = proc.waitFor(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                proc.destroyForcibly();
                result.put("reachable", false);
                result.put("error", "连接超时");
                return result;
            }

            int exitCode = proc.exitValue();
            boolean ok = exitCode == 0 && output.toString().contains("__HYPERNODE_OK__");

            result.put("reachable", ok);
            result.put("exitCode", exitCode);
            if (!ok) {
                result.put("error", output.toString().trim());
            }
        } catch (Exception e) {
            log.error("SSH test failed for {}", ip, e);
            result.put("reachable", false);
            result.put("error", e.getMessage());
        } finally {
            deleteTempKey(keyFile);
        }
        return result;
    }

    private Map<String, Object> doCollectSpecs(String ip, Integer port, String username, String privateKey) {
        Map<String, Object> specs = new HashMap<>();
        Path keyFile = null;
        try {
            keyFile = writeTempKey(privateKey);

            String script = String.join(" && ",
                "echo __CPU_INFO__; lscpu",
                "echo __MEM_INFO__; free -h && echo '---' && cat /proc/meminfo | head -20",
                "echo __DISK_INFO__; df -h && echo '---' && lsblk -o NAME,SIZE,TYPE,MODEL,TRAN",
                "echo __KERNEL__; uname -r",
                "echo __OS__; cat /etc/os-release 2>/dev/null",
                "echo __GPU_INFO__; nvidia-smi --query-gpu=name,memory.total,driver_version,compute_cap,gpu_serial,uuid --format=csv,noheader 2>/dev/null || echo NO_GPU",
                "echo __NVLINK_INFO__; nvidia-smi nvlink --status 2>/dev/null || echo NO_NVLINK",
                "echo __IB_INFO__; (ibstat 2>/dev/null || ibv_devinfo 2>/dev/null || echo NO_IB) | head -50",
                "echo __NETWORK_INFO__; ip link show && echo '---' && ethtool -i eth0 2>/dev/null || echo NO_ETH0",
                "echo __NUMA_INFO__; numactl --hardware",
                "echo __PCIE_INFO__; lspci -vv | grep -A 10 -B 2 'NVIDIA|MLX'",
                "echo __CUDA__; nvcc --version 2>/dev/null || echo NO_CUDA",
                "echo __DOCKER__; docker --version 2>/dev/null || echo NO_DOCKER",
                "echo __K8S__; kubectl version --short 2>/dev/null || echo NO_K8S",
                "echo __CONTAINERD__; containerd --version 2>/dev/null || echo NO_CONTAINERD"
            );

            String sshCmd = buildSshCommand(ip, port, username, keyFile, script);
            ProcessBuilder pb = new ProcessBuilder("bash", "-c", sshCmd);
            pb.redirectErrorStream(true);
            Process proc = pb.start();

            StringBuilder output = new StringBuilder();
            try (var reader = new BufferedReader(new InputStreamReader(proc.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean finished = proc.waitFor(30, TimeUnit.SECONDS);
            if (!finished) {
                proc.destroyForcibly();
                specs.put("error", "采集超时");
                return specs;
            }

            String raw = output.toString();
            specs.put("cpu", extractSection(raw, "__CPU_INFO__", "__MEM_INFO__"));
            specs.put("memory", extractSection(raw, "__MEM_INFO__", "__DISK_INFO__"));
            specs.put("disk", extractSection(raw, "__DISK_INFO__", "__KERNEL__"));
            specs.put("kernel", extractSection(raw, "__KERNEL__", "__OS__").trim());
            specs.put("os", extractSection(raw, "__OS__", "__GPU_INFO__"));
            specs.put("gpu", extractSection(raw, "__GPU_INFO__", "__NVLINK_INFO__"));
            specs.put("nvlink", extractSection(raw, "__NVLINK_INFO__", "__IB_INFO__"));
            specs.put("ib", extractSection(raw, "__IB_INFO__", "__NETWORK_INFO__"));
            specs.put("network", extractSection(raw, "__NETWORK_INFO__", "__NUMA_INFO__"));
            specs.put("numa", extractSection(raw, "__NUMA_INFO__", "__PCIE_INFO__"));
            specs.put("pcie", extractSection(raw, "__PCIE_INFO__", "__CUDA__"));
            specs.put("cuda", extractSection(raw, "__CUDA__", "__DOCKER__").trim());
            specs.put("docker", extractSection(raw, "__DOCKER__", "__K8S__").trim());
            specs.put("k8s", extractSection(raw, "__K8S__", "__CONTAINERD__").trim());
            specs.put("containerd", extractAfter(raw, "__CONTAINERD__").trim());
            specs.put("collectedAt", System.currentTimeMillis());

        } catch (Exception e) {
            log.error("Spec collection failed for {}", ip, e);
            specs.put("error", e.getMessage());
        } finally {
            deleteTempKey(keyFile);
        }
        return specs;
    }

    private String buildSshCommand(String ip, Integer port, String username, Path keyFile, String remoteCmd) {
        int p = port != null ? port : 22;
        String keyOpt = keyFile != null ? "-i " + keyFile.toAbsolutePath() + " " : "";
        return String.format(
            "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null " +
            "-o ConnectTimeout=%d -o BatchMode=yes %s -p %d %s@%s '%s'",
            CONNECT_TIMEOUT_SECONDS, keyOpt, p, username, ip,
            remoteCmd.replace("'", "'\"'\"'"));
    }

    private Path writeTempKey(String privateKey) {
        if (privateKey == null || privateKey.isBlank()) return null;
        try {
            Path tmp = Files.createTempFile("hypernode-ssh-", ".key");
            // Convert Windows line endings to Unix and trim whitespace
            String normalizedKey = privateKey.trim().replaceAll("\r\n", "\n");
            // Ensure the key ends with a newline
            if (!normalizedKey.endsWith("\n")) {
                normalizedKey += "\n";
            }
            Files.writeString(tmp, normalizedKey);
            Files.setPosixFilePermissions(tmp, Set.of(
                PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
            return tmp;
        } catch (Exception e) {
            log.warn("Failed to write temp key file", e);
            return null;
        }
    }

    private void deleteTempKey(Path keyFile) {
        if (keyFile != null) {
            try { Files.deleteIfExists(keyFile); } catch (Exception ignored) {}
        }
    }

    private String extractSection(String raw, String startMarker, String endMarker) {
        int s = raw.indexOf(startMarker);
        int e = raw.indexOf(endMarker);
        if (s < 0) return "";
        s += startMarker.length();
        if (e < 0) e = raw.length();
        return raw.substring(s, e).trim();
    }

    private String extractAfter(String raw, String marker) {
        int s = raw.indexOf(marker);
        if (s < 0) return "";
        return raw.substring(s + marker.length()).trim();
    }

    private String toJson(Map<String, Object> map) {
        try {
            var sb = new StringBuilder("{");
            boolean first = true;
            for (var entry : map.entrySet()) {
                if (!first) sb.append(",");
                sb.append("\"").append(entry.getKey()).append("\":");
                Object v = entry.getValue();
                if (v instanceof Number) {
                    sb.append(v);
                } else {
                    String s = String.valueOf(v)
                        .replace("\\", "\\\\")
                        .replace("\"", "\\\"")
                        .replace("\n", "\\n")
                        .replace("\t", "\\t")
                        .replace("\r", "\\r")
                        .replace("\b", "\\b")
                        .replace("\f", "\\f");
                    sb.append("\"").append(s).append("\"");
                }
                first = false;
            }
            sb.append("}");
            return sb.toString();
        } catch (Exception e) {
            return "{}";
        }
    }
}
