package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.entity.Server;
import com.hypernode.provisioner.service.ServerService;
import com.hypernode.provisioner.service.SshConnectivityService;
import com.hypernode.provisioner.service.SshKeyProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/servers")
@RequiredArgsConstructor
public class ServerController {

    private final ServerService serverService;
    private final SshConnectivityService sshConnectivityService;
    private final SshKeyProfileService sshKeyProfileService;

    @GetMapping
    public ResponseEntity<List<Server>> getAllServers(
            @RequestParam(required = false) String datacenterId) {
        if (datacenterId != null && !datacenterId.isBlank()) {
            return ResponseEntity.ok(serverService.getByDataCenterId(datacenterId));
        }
        return ResponseEntity.ok(serverService.getAllServers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Server> getById(@PathVariable String id) {
        return serverService.getById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/ip/{ipAddress}")
    public ResponseEntity<Server> getByIpAddress(@PathVariable String ipAddress) {
        return serverService.getByIpAddress(ipAddress)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Server server) {
        try {
            Server created = serverService.create(server);
            return ResponseEntity.created(URI.create("/api/v1/servers/" + created.getId()))
                .body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Server server) {
        try {
            server.setId(id);
            Server updated = serverService.update(server);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/ssh-private-key")
    public ResponseEntity<?> rotatePrivateKey(@PathVariable String id,
                                              @RequestBody Map<String, String> payload) {
        try {
            String privateKey = payload.get("privateKey");
            Server updated = serverService.rotatePrivateKey(id, privateKey);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        serverService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Server> updateStatus(@PathVariable String id,
                                               @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        if (status == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(serverService.updateStatus(id, status));
    }

    /**
     * 批量创建服务器（共享同一个 SSH Key Profile）
     */
    @PostMapping("/batch")
    public ResponseEntity<?> batchCreate(@RequestBody Map<String, Object> payload) {
        try {
            String sshKeyProfileId = (String) payload.get("sshKeyProfileId");
            String dataCenterId = (String) payload.get("dataCenterId");
            String gpuTopology = (String) payload.get("gpuTopology");
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> nodes = (java.util.List<Map<String, Object>>) payload.get("nodes");

            if (sshKeyProfileId == null || sshKeyProfileId.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "sshKeyProfileId is required"));
            }
            if (nodes == null || nodes.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "nodes list is required"));
            }

            java.util.List<Server> created = new java.util.ArrayList<>();
            java.util.List<String> errors = new java.util.ArrayList<>();

            for (Map<String, Object> node : nodes) {
                try {
                    String ip = (String) node.get("ipAddress");
                    int port = node.get("sshPort") != null ? ((Number) node.get("sshPort")).intValue() : 22;
                    String username = (String) node.get("username");

                    Server server = Server.builder()
                        .ipAddress(ip)
                        .sshPort(port)
                        .username(username != null ? username : "")
                        .sshKeyProfileId(sshKeyProfileId)
                        .gpuTopology(gpuTopology)
                        .status("PENDING")
                        .build();

                    if (dataCenterId != null && !dataCenterId.isBlank()) {
                        server.setDataCenter(com.hypernode.provisioner.entity.DataCenter.builder().id(dataCenterId).build());
                    }

                    Server saved = serverService.createWithKeyProfile(server);
                    created.add(saved);
                } catch (Exception e) {
                    errors.add(node.get("ipAddress") + ": " + e.getMessage());
                }
            }

            return ResponseEntity.ok(Map.of(
                "created", created.size(),
                "failed", errors.size(),
                "errors", errors
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 测试已保存节点的 SSH 连通性
     */
    @PostMapping("/{id}/test-connection")
    public ResponseEntity<Map<String, Object>> testConnection(@PathVariable String id) {
        return ResponseEntity.ok(sshConnectivityService.testConnection(id));
    }

    /**
     * 新建前预测试 SSH 连通性（不需要节点已存在于数据库）
     */
    @PostMapping("/test-connection")
    public ResponseEntity<Map<String, Object>> testConnectionPreCreate(
            @RequestBody Map<String, String> payload) {
        String ip = payload.get("ipAddress");
        int port = Integer.parseInt(payload.getOrDefault("sshPort", "22"));
        String user = payload.get("username");
        String privateKey = payload.get("privateKey");
        String keyProfileId = payload.get("sshKeyProfileId");

        if (ip == null || user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "ipAddress and username are required"));
        }

        if (keyProfileId != null && !keyProfileId.isBlank()) {
            try {
                privateKey = sshKeyProfileService.getDecryptedKey(keyProfileId);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid key profile: " + e.getMessage()));
            }
        }

        if (privateKey == null || privateKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "privateKey or sshKeyProfileId required"));
        }

        return ResponseEntity.ok(sshConnectivityService.testConnectionPreCreate(ip, port, user, privateKey));
    }

    /**
     * 采集远程服务器系统规格
     */
    @GetMapping("/{id}/specs")
    public ResponseEntity<Map<String, Object>> getSpecs(@PathVariable String id) {
        return ResponseEntity.ok(sshConnectivityService.collectSystemSpecs(id));
    }
}
