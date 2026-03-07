package com.hypernode.provisioner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DataCenter Entity
 * 数据中心/区域配置实体
 * 用于管理代理、镜像源等环境配置
 */
@Entity
@Table(name = "data_centers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataCenter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * 数据中心名称
     */
    @Column(nullable = false, unique = true)
    private String name;

    /**
     * HTTP 代理地址
     */
    @Column(length = 500)
    private String httpProxy;

    /**
     * HTTPS 代理地址
     */
    @Column(length = 500)
    private String httpsProxy;

    /**
     * APT 镜像源
     */
    @Column(length = 500)
    private String aptMirror;

    /**
     * HuggingFace 镜像源
     */
    @Column(length = 500)
    private String huggingfaceMirror;

    /**
     * 是否启用
     */
    @Column
    @Builder.Default
    private Boolean enabled = true;

    /**
     * 创建时间
     */
    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}
