package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.entity.AuditLog;
import com.hypernode.provisioner.service.SecurityAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditController {

    private final SecurityAuditService securityAuditService;

    @PostMapping("/force-run")
    public ResponseEntity<Map<String, String>> logForceRun(@RequestBody Map<String, String> request) {
        String taskId = request.get("taskId");
        String userId = request.getOrDefault("userId", "system");
        String ipAddress = request.getOrDefault("ipAddress", "unknown");
        securityAuditService.logForceRun(taskId, userId, ipAddress);
        return ResponseEntity.ok(Map.of("status", "logged", "taskId", taskId));
    }

    @PostMapping("/rollback")
    public ResponseEntity<Map<String, String>> logRollback(@RequestBody Map<String, String> request) {
        String taskId = request.get("taskId");
        String userId = request.getOrDefault("userId", "system");
        String ipAddress = request.getOrDefault("ipAddress", "unknown");
        String reason = request.getOrDefault("reason", "User requested rollback");
        securityAuditService.logRollback(taskId, userId, ipAddress, reason);
        return ResponseEntity.ok(Map.of("status", "logged", "taskId", taskId));
    }

    @GetMapping("/logs")
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String targetId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<AuditLog> result = securityAuditService.getLogs(action, targetId, page, size);
        return ResponseEntity.ok(Map.of(
            "logs", result.getContent(),
            "total", result.getTotalElements(),
            "page", result.getNumber(),
            "totalPages", result.getTotalPages()
        ));
    }
}
