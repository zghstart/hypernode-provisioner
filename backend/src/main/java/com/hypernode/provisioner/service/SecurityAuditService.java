package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.AuditLog;
import com.hypernode.provisioner.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityAuditService {

    private final AuditLogRepository auditLogRepository;

    public void logForceRun(String taskId, String userId, String ipAddress) {
        save("FORCE_RUN", taskId, userId, ipAddress,
            Map.of("action", "force_run", "taskId", taskId));
    }

    public void logRollback(String taskId, String userId, String ipAddress, String reason) {
        save("ROLLBACK", taskId, userId, ipAddress,
            Map.of("action", "rollback", "taskId", taskId, "reason", reason));
    }

    public void logCredentialAccess(String serverId, String userId, String ipAddress) {
        save("CREDENTIAL_ACCESS", serverId, userId, ipAddress,
            Map.of("action", "credential_access", "serverId", serverId));
    }

    public void logProvisionStart(String serverId, String userId, String ipAddress, String templateId) {
        save("PROVISION_START", serverId, userId, ipAddress,
            Map.of("action", "provision_start", "serverId", serverId,
                   "templateId", templateId != null ? templateId : "none"));
    }

    public Page<AuditLog> getLogs(String action, String targetId, int page, int size) {
        var pageable = PageRequest.of(page, size);
        if (action != null || targetId != null) {
            return auditLogRepository.findFiltered(action, targetId, pageable);
        }
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    private void save(String action, String targetId, String userId, String ipAddress, Map<String, String> details) {
        try {
            var entry = AuditLog.builder()
                .action(action)
                .targetId(targetId)
                .userId(userId != null ? userId : "system")
                .ipAddress(ipAddress != null ? ipAddress : "unknown")
                .details(toJson(details))
                .build();
            auditLogRepository.save(entry);
            log.info("AUDIT: {} target={} user={}", action, targetId, userId);
        } catch (Exception e) {
            log.error("Failed to persist audit log: {} {}", action, targetId, e);
        }
    }

    private String toJson(Map<String, String> map) {
        try {
            var sb = new StringBuilder("{");
            var first = true;
            for (var entry : map.entrySet()) {
                if (!first) sb.append(",");
                sb.append("\"").append(entry.getKey()).append("\":\"")
                  .append(entry.getValue().replace("\"", "\\\"")).append("\"");
                first = false;
            }
            sb.append("}");
            return sb.toString();
        } catch (Exception e) {
            return "{}";
        }
    }
}
