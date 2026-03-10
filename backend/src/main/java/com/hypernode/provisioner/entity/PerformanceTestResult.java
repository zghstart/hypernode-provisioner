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
 * 性能测试结果实体
 * 存储 GPU 服务器性能测试的详细结果
 */
@Entity
@Table(name = "performance_test_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceTestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * 服务器 ID
     */
    @Column(name = "server_id", nullable = false)
    private String serverId;

    /**
     * 测试类型
     */
    @Column(name = "test_type", nullable = false)
    private String testType;

    /**
     * 测试配置参数（JSON 格式）
     */
    @Column(name = "test_config", columnDefinition = "TEXT", nullable = false)
    private String testConfig;

    /**
     * 测试结果（JSON 格式）
     */
    @Column(name = "test_result", columnDefinition = "TEXT", nullable = false)
    private String testResult;

    /**
     * 测试状态
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "PENDING";

    /**
     * 测试开始时间
     */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /**
     * 测试完成时间
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * 测试持续时间（秒）
     */
    @Column(name = "duration_seconds")
    private Double durationSeconds;

    /**
     * 错误信息（如果有）
     */
    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    /**
     * 创建时间
     */
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * 更新时间
     */
    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
