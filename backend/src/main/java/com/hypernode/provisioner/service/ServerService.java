package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.Server;
import com.hypernode.provisioner.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

/**
 * Server Service
 * 服务器资产管理服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ServerService {

    private final ServerRepository serverRepository;
    private final PasswordEncodingService passwordEncodingService;

    /**
     * 获取所有服务器（返回脱敏数据）
     */
    public List<Server> getAllServers() {
        return serverRepository.findAll().stream().map(this::stripSensitive).toList();
    }

    /**
     * 根据 ID 获取服务器（返回脱敏数据）
     */
    public Optional<Server> getById(String id) {
        return serverRepository.findById(id).map(this::stripSensitive);
    }

    /**
     * 根据 IP 地址获取服务器（返回脱敏数据）
     */
    public Optional<Server> getByIpAddress(String ipAddress) {
        return serverRepository.findByIpAddress(ipAddress).map(this::stripSensitive);
    }

    /**
     * 创建服务器
     */
    public Server create(Server server) {
        server.setId(null);
        if (server.getStatus() == null || server.getStatus().isBlank()) {
            server.setStatus("PENDING");
        }
        normalizeSshCredentials(server, null, true);
        server.setUpdatedAt(LocalDateTime.now());
        Server saved = serverRepository.save(server);
        return stripSensitive(saved);
    }

    /**
     * 通过 SSH Key Profile 创建服务器（批量场景，不要求内联私钥）
     */
    public Server createWithKeyProfile(Server server) {
        server.setId(null);
        if (server.getStatus() == null || server.getStatus().isBlank()) {
            server.setStatus("PENDING");
        }
        if (server.getSshKeyProfileId() == null || server.getSshKeyProfileId().isBlank()) {
            throw new IllegalArgumentException("sshKeyProfileId is required for batch creation");
        }
        server.setUpdatedAt(LocalDateTime.now());
        Server saved = serverRepository.save(server);
        return stripSensitive(saved);
    }

    /**
     * 更新服务器
     */
    public Server update(Server incoming) {
        if (incoming.getId() == null || incoming.getId().isBlank()) {
            throw new IllegalArgumentException("Server id is required for update");
        }

        Server existing = serverRepository.findById(incoming.getId())
            .orElseThrow(() -> new RuntimeException("Server not found: " + incoming.getId()));

        existing.setIpAddress(incoming.getIpAddress());
        existing.setSshPort(incoming.getSshPort());
        existing.setUsername(incoming.getUsername());
        existing.setDataCenter(incoming.getDataCenter());
        existing.setGpuTopology(incoming.getGpuTopology());
        existing.setStatus(incoming.getStatus());
        existing.setLastDeploymentVersion(incoming.getLastDeploymentVersion());

        normalizeSshCredentials(existing, incoming.getPrivateKeyEncrypted(), false);
        existing.setUpdatedAt(LocalDateTime.now());

        Server saved = serverRepository.save(existing);
        return stripSensitive(saved);
    }

    /**
     * 单独更新 SSH 私钥（轮换场景）
     */
    public Server rotatePrivateKey(String id, String privateKey) {
        Server existing = serverRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Server not found: " + id));

        if (privateKey == null || privateKey.isBlank()) {
            throw new IllegalArgumentException("SSH private key is required");
        }

        existing.setPrivateKeyEncrypted(toEncryptedPrivateKey(privateKey));
        existing.setPasswordEncrypted(null);
        existing.setUpdatedAt(LocalDateTime.now());

        Server saved = serverRepository.save(existing);
        return stripSensitive(saved);
    }

    /**
     * 删除服务器
     */
    public void delete(String id) {
        serverRepository.deleteById(id);
    }

    /**
     * 根据数据中心 ID 获取服务器列表（返回脱敏数据）
     */
    public List<Server> getByDataCenterId(String dataCenterId) {
        return serverRepository.findByDataCenter_Id(dataCenterId).stream().map(this::stripSensitive).toList();
    }

    /**
     * 根据状态获取服务器列表（返回脱敏数据）
     */
    public List<Server> getByStatus(String status) {
        return serverRepository.findByStatus(status).stream().map(this::stripSensitive).toList();
    }

    /**
     * 获取待部署的服务器
     */
    public List<Server> getProvisioningServers() {
        return getByStatus("PROVISIONING");
    }

    /**
     * 获取部署失败的服务器
     */
    public List<Server> getFailedServers() {
        return getByStatus("FAILED");
    }

    /**
     * 更新服务器状态
     */
    public Server updateStatus(String id, String status) {
        Server server = serverRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Server not found: " + id));
        server.setStatus(status);
        server.setUpdatedAt(LocalDateTime.now());
        return stripSensitive(serverRepository.save(server));
    }

    private void normalizeSshCredentials(Server target, String incomingPrivateKey, boolean creating) {
        boolean hasKeyProfile = target.getSshKeyProfileId() != null && !target.getSshKeyProfileId().isBlank();

        String candidate = incomingPrivateKey;
        if (candidate == null) {
            candidate = target.getPrivateKeyEncrypted();
        }

        if (creating && !hasKeyProfile && (candidate == null || candidate.isBlank())) {
            throw new IllegalArgumentException("SSH private key or key profile is required when creating server");
        }

        if (candidate != null && !candidate.isBlank()) {
            target.setPrivateKeyEncrypted(toEncryptedPrivateKey(candidate));
        }

        if (!creating && !hasKeyProfile && (target.getPrivateKeyEncrypted() == null || target.getPrivateKeyEncrypted().isBlank())) {
            throw new IllegalArgumentException("SSH private key or key profile is required");
        }

        target.setPasswordEncrypted(null);
    }

    private String toEncryptedPrivateKey(String value) {
        String trimmed = value.trim();
        if (looksLikePrivateKey(trimmed)) {
            return passwordEncodingService.encryptPrivateKey(trimmed);
        }
        if (looksLikeEncryptedPrivateKey(trimmed)) {
            return trimmed;
        }
        throw new IllegalArgumentException("Invalid SSH private key format");
    }

    private boolean looksLikePrivateKey(String key) {
        return key.contains("-----BEGIN") && key.contains("PRIVATE KEY-----");
    }

    private boolean looksLikeEncryptedPrivateKey(String encoded) {
        try {
            byte[] decoded = Base64.getDecoder().decode(encoded);
            String plain = new String(decoded);
            return looksLikePrivateKey(plain);
        } catch (Exception e) {
            return false;
        }
    }

    private Server stripSensitive(Server server) {
        return Server.builder()
            .id(server.getId())
            .ipAddress(server.getIpAddress())
            .sshPort(server.getSshPort())
            .username(server.getUsername())
            .passwordEncrypted(null)
            .privateKeyEncrypted(null)
            .sshKeyProfileId(server.getSshKeyProfileId())
            .dataCenter(null)
            .gpuTopology(server.getGpuTopology())
            .status(server.getStatus())
            .lastDeploymentVersion(server.getLastDeploymentVersion())
            .connectStatus(server.getConnectStatus())
            .lastCheckAt(server.getLastCheckAt())
            .systemSpecs(server.getSystemSpecs())
            .createdAt(server.getCreatedAt())
            .updatedAt(server.getUpdatedAt())
            .build();
    }
}
