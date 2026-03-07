package com.hypernode.provisioner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
// 暂时移除 JSON 类型支持，改用 String 存储
// import org.hibernate.annotations.JdbcTypeCode;
// import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Task Entity
 * 任务 DAG 实体
 * 追踪 Ansible 执行状态和进度
 */
@Entity
@Table(name = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * 关联的服务器 ID
     */
    @Column(nullable = false)
    private String serverId;

    /**
     * 任务状态
     * PENDING, RUNNING, COMPLETED, FAILED, ROLLING_BACK, ROLLED_BACK
     */
    @Column(nullable = false)
    private String status;

    /**
     * 当前执行步骤
     */
    @Builder.Default
    private Integer currentStep = 0;

    /**
     * 总步骤数
     */
    @Builder.Default
    private Integer totalSteps = 0;

    /**
     * 任务日志
     * JSONB 格式存储执行日志
     */
    @Column(columnDefinition = "JSONB")
    private String logs;

    /**
     * 是否需要回滚
     */
    @Column
    @Builder.Default
    private Boolean rollbackRequired = false;

    /**
     * 重试次数
     */
    @Column
    @Builder.Default
    private Integer retryCount = 0;

    /**
     * 是否强制执行
     */
    @Column
    @Builder.Default
    private Boolean forceRun = false;

    /**
     * 开始时间
     */
    @Builder.Default
    private LocalDateTime startedAt = null;

    /**
     * 完成时间
     */
    @Builder.Default
    private LocalDateTime completedAt = null;

    /**
     * 额外的元数据
     * 注意：Map 类型需要 hibernate-types 依赖和 @Type 注解
     * 暂时使用 String 存储 JSON，后续添加完整支持
     */
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String metadata = "{}";

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
