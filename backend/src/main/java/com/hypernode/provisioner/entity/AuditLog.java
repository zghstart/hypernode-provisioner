package com.hypernode.provisioner.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_action", columnList = "action"),
    @Index(name = "idx_audit_target", columnList = "targetId"),
    @Index(name = "idx_audit_created", columnList = "createdAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(nullable = false)
    private String targetId;

    @Column(nullable = false, length = 100)
    @Builder.Default
    private String userId = "system";

    @Column(length = 45)
    @Builder.Default
    private String ipAddress = "unknown";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String details = "{}";

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
