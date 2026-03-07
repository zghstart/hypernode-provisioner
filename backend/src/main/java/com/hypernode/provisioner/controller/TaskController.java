package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.entity.Task;
import com.hypernode.provisioner.service.SecurityAuditService;
import com.hypernode.provisioner.service.TaskService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

/**
 * Task Controller
 * 任务管理控制器
 */
@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final ObjectMapper objectMapper;
    private final SecurityAuditService securityAuditService;

    /**
     * 获取所有任务
     */
    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks() {
        return ResponseEntity.ok(taskService.getAllTasks());
    }

    /**
     * 根据 ID 获取任务
     */
    @GetMapping("/{id}")
    public ResponseEntity<Task> getById(@PathVariable String id) {
        return taskService.getById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 根据服务器 ID 获取任务列表
     */
    @GetMapping("/server/{serverId}")
    public ResponseEntity<List<Task>> getByServerId(@PathVariable String serverId) {
        return ResponseEntity.ok(taskService.getByServerId(serverId));
    }

    /**
     * 创建任务
     */
    @PostMapping
    public ResponseEntity<Task> create(@RequestBody Task task) {
        Task created = taskService.create(task);
        return ResponseEntity.created(URI.create("/api/v1/tasks/" + created.getId()))
            .body(created);
    }

    /**
     * 更新任务
     */
    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable String id,
                                        @RequestBody Task task) {
        task.setId(id);
        Task updated = taskService.update(task);
        return ResponseEntity.ok(updated);
    }

    /**
     * 删除任务
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 更新任务进度
     */
    @PatchMapping("/{id}/progress")
    public ResponseEntity<Task> updateProgress(@PathVariable String id,
                                                @RequestBody Map<String, Object> payload) {
        Integer currentStep = payload.get("currentStep") != null ?
            Integer.parseInt(payload.get("currentStep").toString()) : null;
        Integer totalSteps = payload.get("totalSteps") != null ?
            Integer.parseInt(payload.get("totalSteps").toString()) : null;

        Task updated = taskService.updateProgress(id, currentStep, totalSteps, payload);
        return ResponseEntity.ok(updated);
    }

    /**
     * 强制执行任务（覆盖异常状态，需二次确认；记录审计日志）
     */
    @PatchMapping("/{id}/force-run")
    public ResponseEntity<Task> setForceRun(
            @PathVariable String id,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        Boolean forceRun = payload != null && payload.get("forceRun") != null
            ? Boolean.TRUE.equals(payload.get("forceRun")) : true;
        String userId = payload != null && payload.get("userId") != null
            ? payload.get("userId").toString() : "system";
        String ip = request.getRemoteAddr();
        securityAuditService.logForceRun(id, userId, ip);
        Task updated = taskService.setForceRun(id, forceRun);
        return ResponseEntity.ok(updated);
    }

    /**
     * 获取任务进度
     */
    @GetMapping("/{id}/progress")
    public ResponseEntity<Map<String, Object>> getProgress(@PathVariable String id) {
        return taskService.getById(id)
            .map(task -> {
                try {
                    Map<String, Object> metadata = objectMapper.readValue(
                        task.getMetadata(), new TypeReference<Map<String, Object>>() {});
                    return ResponseEntity.ok(Map.of(
                        "taskId", task.getId(),
                        "status", task.getStatus(),
                        "currentStep", task.getCurrentStep(),
                        "totalSteps", task.getTotalSteps(),
                        "logs", task.getLogs(),
                        "metadata", metadata
                    ));
                } catch (Exception e) {
                    return ResponseEntity.ok(Map.of(
                        "taskId", task.getId(),
                        "status", task.getStatus(),
                        "currentStep", task.getCurrentStep(),
                        "totalSteps", task.getTotalSteps(),
                        "logs", task.getLogs(),
                        "metadata", Map.of()
                    ));
                }
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
