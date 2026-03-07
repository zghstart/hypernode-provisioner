package com.hypernode.provisioner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * ConfigTemplate Entity
 * 配置模板实体
 * 支持多版本部署场景（如 RHEL 8 + Driver 535 + CUDA 12.1）
 */
@Entity
@Table(name = "config_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * 模板名称
     */
    @Column(nullable = false)
    private String name;

    /**
     * 模板描述
     */
    @Column(length = 1000)
    private String description;

    /**
     * 变量定义
     * JSONB 格式: {"nvidia_driver_version": "535", "cuda_version": "12.1"}
     * 暂时使用 String 存储 JSON，后续添加完整支持
     */
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String variables = "{}";

    /**
     * Ansible 变量
     * JSONB 格式存储传递给 playbook 的变量
     * 暂时使用 String 存储 JSON，后续添加完整支持
     */
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String ansibleVars = "{}";

    /**
     * 关联的数据中心
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "data_center_id")
    private DataCenter dataCenter;

    /**
     * 版本号
     */
    @Column(nullable = false)
    private String version;

    /**
     * 是否启用
     */
    @Column
    @Builder.Default
    private Boolean enabled = true;

    /**
     * 创建者
     */
    @Builder.Default
    private String createdBy = null;

    /**
     * 创建时间
     */
    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * 更新时间
     */
    @Builder.Default
    private LocalDateTime updatedAt = null;
}
