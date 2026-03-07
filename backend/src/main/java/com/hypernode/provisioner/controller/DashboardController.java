package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.repository.AuditLogRepository;
import com.hypernode.provisioner.service.ServerService;
import com.hypernode.provisioner.service.TaskService;
import com.hypernode.provisioner.service.ConfigTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ServerService serverService;
    private final TaskService taskService;
    private final ConfigTemplateService configTemplateService;
    private final AuditLogRepository auditLogRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        var servers = serverService.getAllServers();
        var tasks = taskService.getAllTasks();

        long totalServers = servers.size();
        long provisioned = servers.stream().filter(s -> "PROVISIONED".equals(s.getStatus())).count();
        long provisioning = servers.stream().filter(s -> "PROVISIONING".equals(s.getStatus())).count();
        long failed = servers.stream().filter(s -> "FAILED".equals(s.getStatus())).count();

        int totalGpus = servers.stream().mapToInt(s -> {
            try {
                if (s.getGpuTopology() == null) return 0;
                String raw = s.getGpuTopology();
                int idx = raw.indexOf("gpu_count");
                if (idx < 0) return 0;
                String after = raw.substring(idx + 10).replaceAll("[^0-9]", " ").trim();
                return Integer.parseInt(after.split("\\s+")[0]);
            } catch (Exception e) { return 0; }
        }).sum();

        long totalTasks = tasks.size();
        long runningTasks = tasks.stream().filter(t -> "RUNNING".equals(t.getStatus())).count();
        long completedTasks = tasks.stream().filter(t -> "COMPLETED".equals(t.getStatus())).count();
        long failedTasks = tasks.stream().filter(t -> "FAILED".equals(t.getStatus())).count();

        long totalTemplates = configTemplateService.getAllTemplates().size();
        long totalAuditLogs = auditLogRepository.count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("servers", Map.of(
            "total", totalServers, "provisioned", provisioned,
            "provisioning", provisioning, "failed", failed, "totalGpus", totalGpus));
        stats.put("tasks", Map.of(
            "total", totalTasks, "running", runningTasks,
            "completed", completedTasks, "failed", failedTasks));
        stats.put("templates", totalTemplates);
        stats.put("auditLogs", totalAuditLogs);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("version", "0.3.0");

        try {
            serverService.getAllServers();
            health.put("database", "connected");
        } catch (Exception e) {
            health.put("database", "error: " + e.getMessage());
        }

        return ResponseEntity.ok(health);
    }
}
