package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.PerformanceTestResult;
import com.hypernode.provisioner.entity.Server;
import com.hypernode.provisioner.repository.PerformanceTestResultRepository;
import com.hypernode.provisioner.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * 性能测试服务
 * 集成所有 GPU 服务器性能测试功能
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PerformanceTestService {

    private final PerformanceTestResultRepository testResultRepository;
    private final ServerRepository serverRepository;
    private final PasswordEncodingService passwordEncodingService;
    private final SshKeyProfileService sshKeyProfileService;

    private static final String TEST_SCRIPTS_DIR = "/tmp/hypernode-performance-tests";

    /**
     * 执行环境检查测试
     */
    @Async
    public CompletableFuture<PerformanceTestResult> runEnvironmentCheck(String serverId) {
        return runTest(serverId, "env_check", Collections.emptyMap());
    }

    /**
     * 执行 GEMM 矩阵乘法测试
     */
    @Async
    public CompletableFuture<PerformanceTestResult> runGemmTest(String serverId, Map<String, Object> config) {
        return runTest(serverId, "gemm", config);
    }

    /**
     * 执行显存带宽测试
     */
    @Async
    public CompletableFuture<PerformanceTestResult> runMemoryBandwidthTest(String serverId) {
        return runTest(serverId, "memory_bandwidth", Collections.emptyMap());
    }

    /**
     * 执行磁盘 I/O 测试
     */
    @Async
    public CompletableFuture<PerformanceTestResult> runDiskIOTest(String serverId) {
        return runTest(serverId, "disk_io", Collections.emptyMap());
    }

    /**
     * 执行 GPU 拓扑测试
     */
    @Async
    public CompletableFuture<PerformanceTestResult> runGpuTopologyTest(String serverId) {
        return runTest(serverId, "gpu_topology", Collections.emptyMap());
    }

    /**
     * 执行 NCCL 通信测试
     */
    @Async
    public CompletableFuture<PerformanceTestResult> runNcclTest(String serverId, Map<String, Object> config) {
        return runTest(serverId, "nccl", config);
    }

    /**
     * 执行 GPU-Burn 压力测试
     */
    @Async
    public CompletableFuture<PerformanceTestResult> runGpuBurnTest(String serverId, int duration) {
        Map<String, Object> config = new HashMap<>();
        config.put("duration", duration);
        return runTest(serverId, "gpu_burn", config);
    }

    /**
     * 执行 Transformer 推理测试
     */
    @Async
    public CompletableFuture<PerformanceTestResult> runInferenceTest(String serverId) {
        return runTest(serverId, "inference", Collections.emptyMap());
    }

    /**
     * 执行全部测试
     */
    @Async
    public CompletableFuture<List<PerformanceTestResult>> runAllTests(String serverId) {
        List<CompletableFuture<PerformanceTestResult>> futures = new ArrayList<>();
        futures.add(runEnvironmentCheck(serverId));
        futures.add(runGemmTest(serverId, Collections.emptyMap()));
        futures.add(runMemoryBandwidthTest(serverId));
        futures.add(runDiskIOTest(serverId));
        futures.add(runGpuTopologyTest(serverId));
        futures.add(runNcclTest(serverId, Collections.emptyMap()));
        futures.add(runInferenceTest(serverId));

        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> futures.stream()
                        .map(CompletableFuture::join)
                        .collect(java.util.stream.Collectors.toList()));
    }

    /**
     * 通用测试执行方法
     */
    private CompletableFuture<PerformanceTestResult> runTest(String serverId, String testType, Map<String, Object> config) {
        PerformanceTestResult result = PerformanceTestResult.builder()
                .serverId(serverId)
                .testType(testType)
                .testConfig(toJson(config))
                .status("RUNNING")
                .startedAt(LocalDateTime.now())
                .build();

        testResultRepository.save(result);

        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> testResult = executeTest(serverId, testType, config);
                result.setTestResult(toJson(testResult));
                result.setStatus("COMPLETED");
                result.setCompletedAt(LocalDateTime.now());
                result.setDurationSeconds(calculateDuration(result.getStartedAt(), result.getCompletedAt()));
            } catch (Exception e) {
                log.error("Test failed: {}", e.getMessage(), e);
                result.setStatus("FAILED");
                result.setErrorMessage(e.getMessage());
                result.setCompletedAt(LocalDateTime.now());
                result.setDurationSeconds(calculateDuration(result.getStartedAt(), result.getCompletedAt()));
            }
            testResultRepository.save(result);
            return result;
        });
    }

    /**
     * 执行具体测试
     */
    private Map<String, Object> executeTest(String serverId, String testType, Map<String, Object> config) throws Exception {
        // 确保测试脚本目录存在
        Files.createDirectories(Path.of(TEST_SCRIPTS_DIR));

        switch (testType) {
            case "env_check":
                return executeEnvironmentCheck(serverId);
            case "gemm":
                return executeGemmTest(serverId, config);
            case "memory_bandwidth":
                return executeMemoryBandwidthTest(serverId);
            case "disk_io":
                return executeDiskIOTest(serverId);
            case "gpu_topology":
                return executeGpuTopologyTest(serverId);
            case "nccl":
                return executeNcclTest(serverId, config);
            case "gpu_burn":
                return executeGpuBurnTest(serverId, config);
            case "inference":
                return executeInferenceTest(serverId);
            default:
                throw new IllegalArgumentException("Unknown test type: " + testType);
        }
    }

    /**
     * 执行环境检查测试
     */
    private Map<String, Object> executeEnvironmentCheck(String serverId) throws Exception {
        String script = """
            echo '{'
            echo '  "os": {'
            echo '    "name": "'$(cat /etc/os-release | grep -E "^NAME=" | cut -d= -f2 | tr -d '"')'",'
            echo '    "version": "'$(cat /etc/os-release | grep -E "^VERSION=" | cut -d= -f2 | tr -d '"')'"'
            echo '  },'
            echo '  "cpu": {'
            echo '    "model": "'$(lscpu | grep -E "^Model name:" | cut -d: -f2 | xargs)'",'
            echo '    "cores": '$(lscpu | grep -E "^Core(s)? per socket:" | cut -d: -f2 | xargs)',''
            echo '    "threads": '$(lscpu | grep -E "^Thread(s)? per core:" | cut -d: -f2 | xargs)''
            echo '  },'
            echo '  "memory": "'$(free -h | grep -E "^Mem:" | awk '{print $2}')'",'
            echo '  "gpu": ['
            nvidia-smi --query-gpu=index,name,memory.total,driver_version --format=csv,noheader | while IFS=, read -r index name memory driver; do
                echo '    {'
                echo '      "index": "'$index'",'
                echo '      "name": "'$name'",'
                echo '      "memory": "'$memory'",'
                echo '      "driver": "'$driver'"'
                echo '    },'
            done | sed '$s/,$//'
            echo '  ],'
            echo '  "cuda": "'$(nvcc --version 2>/dev/null || echo "not found")'",'
            echo '  "pytorch": "'$(python3 -c "import torch; print(torch.__version__)")'",'
            echo '  "disks": ['
            df -h | grep -E "(Filesystem|overlay|nvme|nfs)" | tail -n +2 | while read -r line; do
                fs=$(echo $line | awk '{print $1}')
                size=$(echo $line | awk '{print $2}')
                used=$(echo $line | awk '{print $3}')
                avail=$(echo $line | awk '{print $4}')
                use=$(echo $line | awk '{print $5}')
                mount=$(echo $line | awk '{print $6}')
                echo '    {'
                echo '      "filesystem": "'$fs'",'
                echo '      "size": "'$size'",'
                echo '      "used": "'$used'",'
                echo '      "available": "'$avail'",'
                echo '      "use_percent": "'$use'",'
                echo '      "mount": "'$mount'"'
                echo '    },'
            done | sed '$s/,$//'
            echo '  ],'
            echo '  "network": ['
            ip link show | grep -E "^[0-9]+:" | while read -r line; do
                iface=$(echo $line | awk '{print $2}' | tr -d :)
                state=$(echo $line | grep -oP 'state\\S+' | cut -d'<' -f2 | cut -d'>' -f1)
                echo '    {'
                echo '      "interface": "'$iface'",'
                echo '      "state": "'$state'"'
                echo '    },'
            done | sed '$s/,$//'
            echo '  ]'
            echo '}'
        """;

        return executeRemoteCommand(serverId, script);
    }

    /**
     * 执行 GEMM 测试
     */
    private Map<String, Object> executeGemmTest(String serverId, Map<String, Object> config) throws Exception {
        String script = """
            python3 - << 'EOF'
            import torch
            import time

            matrix_size = ${matrix_size:-8192}
            warmup_iters = ${warmup_iters:-5}
            test_iters = ${test_iters:-20}

            results = {}

            # TF32
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            device = torch.device('cuda:0')
            A = torch.randn(matrix_size, matrix_size, dtype=torch.float32, device=device)
            B = torch.randn(matrix_size, matrix_size, dtype=torch.float32, device=device)

            for _ in range(warmup_iters):
                C = torch.mm(A, B)
            torch.cuda.synchronize()

            start = time.perf_counter()
            for _ in range(test_iters):
                C = torch.mm(A, B)
            torch.cuda.synchronize()
            elapsed = time.perf_counter() - start

            flops = 2 * matrix_size * matrix_size * matrix_size
            tflops = flops / elapsed / 1e12
            results['tf32'] = tflops

            # FP16
            torch.backends.cuda.matmul.allow_tf32 = False
            A = torch.randn(matrix_size, matrix_size, dtype=torch.float16, device=device)
            B = torch.randn(matrix_size, matrix_size, dtype=torch.float16, device=device)

            for _ in range(warmup_iters):
                C = torch.mm(A, B)
            torch.cuda.synchronize()

            start = time.perf_counter()
            for _ in range(test_iters):
                C = torch.mm(A, B)
            torch.cuda.synchronize()
            elapsed = time.perf_counter() - start

            flops = 2 * matrix_size * matrix_size * matrix_size
            tflops = flops / elapsed / 1e12
            results['fp16'] = tflops

            import json
            print(json.dumps(results))
            EOF
        """; 

        return executeRemoteCommand(serverId, script);
    }

    /**
     * 执行显存带宽测试
     */
    private Map<String, Object> executeMemoryBandwidthTest(String serverId) throws Exception {
        String script = """
            python3 - << 'EOF'
            import torch
            import time

            test_sizes_mb = [256, 1024]
            results = {}

            for size_mb in test_sizes_mb:
                device = torch.device('cuda:0')
                num_elements = size_mb * 1024 * 1024 // 4
                src = torch.randn(num_elements, dtype=torch.float32, device=device)
                dst = torch.empty_like(src)

                # Warmup
                for _ in range(10):
                    dst.copy_(src)
                torch.cuda.synchronize()

                # Benchmark
                start = time.perf_counter()
                for _ in range(30):
                    dst.copy_(src)
                torch.cuda.synchronize()
                elapsed = time.perf_counter() - start

                bytes_transferred = num_elements * 4 * 2
                bw_gbs = bytes_transferred * 30 / elapsed / 1e9
                results[f"{size_mb}mb"] = bw_gbs

            import json
            print(json.dumps(results))
            EOF
        """; 

        return executeRemoteCommand(serverId, script);
    }

    /**
     * 执行磁盘 I/O 测试
     */
    private Map<String, Object> executeDiskIOTest(String serverId) throws Exception {
        String script = """
            echo '{'
            echo '  "/tmp": {'
            echo '    "write": "'$(dd if=/dev/zero of=/tmp/test_write.tmp bs=1G count=4 oflag=direct conv=fdatasync 2>&1 | grep -oP '\\d+(\\.\\d+)? [GM]B/s' | tail -1 || echo "N/A")'",'
            echo '    "read": "'$(dd if=/tmp/test_write.tmp of=/dev/null bs=1G iflag=direct 2>&1 | grep -oP '\\d+(\\.\\d+)? [GM]B/s' | tail -1 || echo "N/A")'"
            echo '  },'
            echo '  "/anc-init": {'
            echo '    "write": "'$(if [ -d /anc-init ]; then dd if=/dev/zero of=/anc-init/test_write.tmp bs=1G count=4 oflag=direct conv=fdatasync 2>&1 | grep -oP '\\d+(\\.\\d+)? [GM]B/s' | tail -1; else echo "N/A"; fi)'",'
            echo '    "read": "'$(if [ -d /anc-init ]; then dd if=/anc-init/test_write.tmp of=/dev/null bs=1G iflag=direct 2>&1 | grep -oP '\\d+(\\.\\d+)? [GM]B/s' | tail -1; else echo "N/A"; fi)'"
            echo '  }'
            echo '}'
            rm -f /tmp/test_write.tmp /anc-init/test_write.tmp 2>/dev/null
        """; 

        return executeRemoteCommand(serverId, script);
    }

    /**
     * 执行 GPU 拓扑测试
     */
    private Map<String, Object> executeGpuTopologyTest(String serverId) throws Exception {
        String script = """
            echo '{'
            echo '  "topology": "'$(nvidia-smi topo -m | tr '\n' ' ' | sed 's/"/\\"/g')'",'
            echo '  "nvlink": ['
            for i in $(seq 0 7); do
                echo '    {'
                echo '      "gpu": '$i',''
                echo '      "status": "'$(nvidia-smi nvlink --status -i $i 2>/dev/null | grep -E "(Link|Active)" | tr '\n' ' ' | sed 's/"/\\"/g' || echo "N/A")'"
                echo '    },'
            done | sed '$s/,$//'
            echo '  ]'
            echo '}'
        """; 

        return executeRemoteCommand(serverId, script);
    }

    /**
     * 执行 NCCL 测试
     */
    private Map<String, Object> executeNcclTest(String serverId, Map<String, Object> config) throws Exception {
        String script = """
            python3 - << 'EOF'
            import torch
            import torch.distributed as dist
            import time
            import os

            os.environ['MASTER_ADDR'] = 'localhost'
            os.environ['MASTER_PORT'] = '29500'
            os.environ['RANK'] = '0'
            os.environ['WORLD_SIZE'] = '1'

            dist.init_process_group(backend='nccl')

            test_sizes = [8, 1024**2, 64*1024**2, 256*1024**2, 1024**3]
            size_labels = ['8B', '1MB', '64MB', '256MB', '1GB']
            results = {}

            for size, label in zip(test_sizes, size_labels):
                try:
                    rank = dist.get_rank()
                    num_elements = size // 4
                    tensor = torch.ones(num_elements, dtype=torch.float32, device=f'cuda:{rank}')

                    # Warmup
                    for _ in range(5):
                        dist.all_reduce(tensor, op=dist.ReduceOp.SUM)
                    torch.cuda.synchronize()

                    # Benchmark
                    start = time.perf_counter()
                    for _ in range(20):
                        dist.all_reduce(tensor, op=dist.ReduceOp.SUM)
                    torch.cuda.synchronize()
                    elapsed = time.perf_counter() - start

                    avg_us = elapsed / 20 * 1e6
                    world_size = dist.get_world_size()
                    algo_bw = 2 * (world_size - 1) / world_size * size / (elapsed / 20) / 1e9

                    results[label] = {
                        'latency_us': avg_us,
                        'bandwidth_gbs': algo_bw
                    }
                except Exception as e:
                    results[label] = {'error': str(e)}

            dist.destroy_process_group()

            import json
            print(json.dumps(results))
            EOF
        """; 

        return executeRemoteCommand(serverId, script);
    }

    /**
     * 执行 GPU-Burn 测试
     */
    private Map<String, Object> executeGpuBurnTest(String serverId, Map<String, Object> config) throws Exception {
        int duration = (int) config.getOrDefault("duration", 120);
        String script = """
            # 检查 gpu-burn 是否安装
            if [ ! -f /usr/local/bin/gpu-burn ]; then
                # 安装 gpu-burn
                git clone https://github.com/wilicc/gpu-burn /tmp/gpu-burn
                cd /tmp/gpu-burn && make
                cp gpu_burn /usr/local/bin/gpu-burn
            fi

            # 运行 gpu-burn
            /usr/local/bin/gpu-burn $duration 2>&1 | tee /tmp/gpu-burn.log

            # 解析结果
            echo '{'
            echo '  "output": "'$(cat /tmp/gpu-burn.log | tr '\n' ' ' | sed 's/"/\\"/g')'",'
            echo '  "final_temperatures": "'$(nvidia-smi --query-gpu=index,temperature.gpu --format=csv,noheader | tr '\n' ' ' | sed 's/"/\\"/g')'"
            echo '}'
        """; 

        return executeRemoteCommand(serverId, script);
    }

    /**
     * 执行 Transformer 推理测试
     */
    private Map<String, Object> executeInferenceTest(String serverId) throws Exception {
        String script = """
            python3 - << 'EOF'
            import torch
            import torch.nn as nn
            import time

            # 模型配置
            num_layers = 12
            d_model = 1024
            nhead = 16
            dim_feedforward = 4096
            seq_len = 256
            dtype = torch.float16
            device = torch.device('cuda:0')

            # 构建模型
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=d_model,
                nhead=nhead,
                dim_feedforward=dim_feedforward,
                batch_first=True,
                dtype=dtype,
                device=device,
            )
            model = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
            model.eval()

            # 测试不同 batch size
            batch_sizes = [1, 4, 16, 32]
            results = {}

            for bs in batch_sizes:
                x = torch.randn(bs, seq_len, d_model, dtype=dtype, device=device)

                # Warmup
                for _ in range(10):
                    _ = model(x)
                torch.cuda.synchronize()

                # Benchmark
                start = time.perf_counter()
                for _ in range(50):
                    out = model(x)
                torch.cuda.synchronize()
                elapsed = time.perf_counter() - start

                tokens_per_sec = bs * seq_len * 50 / elapsed
                results[bs] = tokens_per_sec

            import json
            print(json.dumps(results))
            EOF
        """; 

        return executeRemoteCommand(serverId, script);
    }

    /**
     * 执行远程命令
     */
    private Map<String, Object> executeRemoteCommand(String serverId, String command) throws Exception {
        // 获取服务器信息
        var server = serverRepository.findById(serverId)
            .orElseThrow(() -> new RuntimeException("Server not found: " + serverId));

        String privateKey = resolvePrivateKey(server);
        return doExecuteRemoteCommand(
            server.getIpAddress(), server.getSshPort(), server.getUsername(), privateKey, command
        );
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

    private Map<String, Object> doExecuteRemoteCommand(String ip, Integer port, String username, String privateKey, String command) throws Exception {
        Map<String, Object> result = new HashMap<>();
        Path keyFile = null;

        try {
            keyFile = writeTempKey(privateKey);
            String sshCmd = buildSshCommand(ip, port, username, keyFile, command);

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

            boolean finished = proc.waitFor(60, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished) {
                proc.destroyForcibly();
                result.put("error", "Command execution timed out");
                return result;
            }

            int exitCode = proc.exitValue();
            result.put("exitCode", exitCode);

            if (exitCode == 0) {
                // 尝试解析 JSON 输出
                try {
                    String outputStr = output.toString().trim();
                    if (outputStr.startsWith("{") && outputStr.endsWith("}")) {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        return mapper.readValue(outputStr, Map.class);
                    } else {
                        result.put("output", outputStr);
                    }
                } catch (Exception e) {
                    result.put("output", output.toString().trim());
                }
            } else {
                result.put("error", output.toString().trim());
            }
        } catch (Exception e) {
            log.error("Remote command execution failed for {}", ip, e);
            result.put("error", e.getMessage());
        } finally {
            if (keyFile != null) {
                try { java.nio.file.Files.deleteIfExists(keyFile); } catch (Exception ignored) {}
            }
        }
        return result;
    }

    private String buildSshCommand(String ip, Integer port, String username, java.nio.file.Path keyFile, String remoteCmd) {
        int p = port != null ? port : 22;
        String keyOpt = keyFile != null ? "-i " + keyFile.toAbsolutePath() + " " : "";
        return String.format(
            "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null " +
            "-o ConnectTimeout=30 -o BatchMode=yes %s -p %d %s@%s '%s'",
            keyOpt, p, username, ip,
            remoteCmd.replace("'", "'\"'\"'")
        );
    }

    private java.nio.file.Path writeTempKey(String privateKey) {
        if (privateKey == null || privateKey.isBlank()) return null;
        try {
            java.nio.file.Path tmp = java.nio.file.Files.createTempFile("hypernode-perf-", ".key");
            String normalizedKey = privateKey.trim().replaceAll("\r\n", "\n");
            if (!normalizedKey.endsWith("\n")) {
                normalizedKey += "\n";
            }
            java.nio.file.Files.writeString(tmp, normalizedKey);
            java.nio.file.Files.setPosixFilePermissions(tmp, java.util.Set.of(
                java.nio.file.attribute.PosixFilePermission.OWNER_READ, 
                java.nio.file.attribute.PosixFilePermission.OWNER_WRITE
            ));
            return tmp;
        } catch (Exception e) {
            log.warn("Failed to write temp key file", e);
            return null;
        }
    }

    /**
     * 计算测试持续时间
     */
    private Double calculateDuration(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) return null;
        return java.time.Duration.between(start, end).toMillis() / 1000.0;
    }

    /**
     * 转换为 JSON 字符串
     */
    private String toJson(Object obj) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(obj);
        } catch (Exception e) {
            log.error("Failed to convert to JSON", e);
            return "{}";
        }
    }

    /**
     * 获取测试结果
     */
    public List<PerformanceTestResult> getTestResults(String serverId) {
        return testResultRepository.findByServerId(serverId);
    }

    /**
     * 获取测试结果详情
     */
    public Optional<PerformanceTestResult> getTestResultById(String id) {
        return testResultRepository.findById(id);
    }
}
