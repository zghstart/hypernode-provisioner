package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.service.TaskExecutionService;
import com.hypernode.provisioner.service.TaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskExecutionController {

    private final TaskExecutionService taskExecutionService;
    private final TaskService taskService;

    @PostMapping("/{taskId}/execute")
    public ResponseEntity<Map<String, String>> executeProvision(
            @PathVariable String taskId,
            @RequestBody Map<String, String> request) {

        String serverId = request.get("serverId");
        String playbookPath = request.getOrDefault("playbookPath", "playbooks/provision_gpu_node.yml");

        Map<String, String> extraVars = new HashMap<>();
        extraVars.put("target_host", serverId);
        request.forEach((k, v) -> {
            if (!k.equals("serverId") && !k.equals("playbookPath")) {
                extraVars.put(k, v);
            }
        });

        log.info("Starting provision execution for task: {}", taskId);
        taskExecutionService.executeProvision(taskId, serverId, playbookPath, extraVars);

        return ResponseEntity.ok(Map.of(
            "taskId", taskId,
            "status", "EXECUTING",
            "message", "Provision execution started"
        ));
    }

    @PostMapping("/{taskId}/rollback")
    public ResponseEntity<Map<String, String>> executeRollback(
            @PathVariable String taskId,
            @RequestBody Map<String, String> request) {

        String serverId = request.get("serverId");
        String playbookPath = request.getOrDefault("playbookPath", "playbooks/rollback_gpu_node.yml");

        log.info("Starting rollback execution for task: {}", taskId);
        taskExecutionService.executeRollback(taskId, serverId, playbookPath, Map.of("target_host", serverId));

        return ResponseEntity.ok(Map.of(
            "taskId", taskId,
            "status", "ROLLBACK_EXECUTING",
            "message", "Rollback execution started"
        ));
    }

    @GetMapping("/{taskId}/status")
    public ResponseEntity<Map<String, Object>> getTaskStatus(@PathVariable String taskId) {
        var task = taskService.getById(taskId);
        if (task.isEmpty()) return ResponseEntity.notFound().build();

        var t = task.get();
        return ResponseEntity.ok(Map.of(
            "taskId", taskId,
            "status", t.getStatus(),
            "currentStep", t.getCurrentStep(),
            "totalSteps", t.getTotalSteps(),
            "timestamp", System.currentTimeMillis()
        ));
    }
}
