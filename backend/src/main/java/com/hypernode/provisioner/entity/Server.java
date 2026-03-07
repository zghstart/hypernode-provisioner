package com.hypernode.provisioner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Server Entity
 * 服务器资产实体
 * 管理 GPU 节点的 SSH 凭证和硬件配置
 */
@Entity
@Table(name = "servers", uniqueConstraints = {
    @UniqueConstraint(name = "uk_server_ip_port", columnNames = {"ip_address", "ssh_port"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Server {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * IP 地址
     */
    @Column(nullable = false)
    private String ipAddress;

    /**
     * SSH 端口
     */
    @Column
    @Builder.Default
    private Integer sshPort = 22;

    /**
     * SSH 用户名
     */
    @Column(nullable = false)
    private String username;

    /**
     * 加密后的 SSH 密码
     * 生产环境应使用 Vault 动态获取，而非存储
     */
    @Column(length = 1000)
    private String passwordEncrypted;

    /**
     * 加密后的私钥
     */
    @Column(columnDefinition = "TEXT")
    private String privateKeyEncrypted;

    @Column(name = "ssh_key_profile_id")
    private String sshKeyProfileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "data_center_id")
    private DataCenter dataCenter;

    /**
     * GPU 拓扑结构
     * JSONB 格式存储: {"gpu_count": 8, "gpu_model": "H100", "nvlink": true}
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    @Builder.Default
    private String gpuTopology = null;

    /**
     * 服务器状态
     * PROVISIONING, PROVISIONED, FAILED, DEPROVISIONING, DEPROVISIONED
     */
    @Column(nullable = false)
    private String status;

    @Builder.Default
    private String lastDeploymentVersion = null;

    @Column(length = 20)
    @Builder.Default
    private String connectStatus = "UNKNOWN";

    @Builder.Default
    private LocalDateTime lastCheckAt = null;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    @Builder.Default
    private String systemSpecs = null;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = null;
}
