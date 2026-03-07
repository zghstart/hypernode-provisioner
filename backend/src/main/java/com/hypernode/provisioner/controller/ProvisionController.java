package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.config.EventPublisherConfig;
import com.hypernode.provisioner.entity.ConfigTemplate;
import com.hypernode.provisioner.entity.Task;
import com.hypernode.provisioner.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/provision")
@RequiredArgsConstructor
public class ProvisionController {

    private final TaskService taskService;
    private final ServerService serverService;
    private final ConfigTemplateService configTemplateService;
    private final TaskExecutionService taskExecutionService;
    private final SecurityAuditService securityAuditService;
    private final EventPublisherConfig.DomainEventPublisher eventPublisher;

    @PostMapping("/{serverId}/start")
    public ResponseEntity<Map<String, String>> startProvision(
            @PathVariable String serverId,
            @RequestParam(required = false) String templateId) {

        log.info("Starting provision for server: {} with template: {}", serverId, templateId);

        var optionalServer = serverService.getById(serverId);
        if (optionalServer.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        var server = optionalServer.get();

        Map<String, String> extraVars = new HashMap<>();

        if (server.getDataCenter() != null) {
            var dc = server.getDataCenter();
            if (dc.getHttpProxy() != null) extraVars.put("http_proxy", dc.getHttpProxy());
            if (dc.getHttpsProxy() != null) extraVars.put("https_proxy", dc.getHttpsProxy());
            if (dc.getAptMirror() != null) extraVars.put("apt_mirror", dc.getAptMirror());
            if (dc.getHuggingfaceMirror() != null) extraVars.put("huggingface_mirror", dc.getHuggingfaceMirror());
        }

        String templateName = "none";
        if (templateId != null && !templateId.isEmpty()) {
            var optTpl = configTemplateService.getById(templateId);
            if (optTpl.isPresent()) {
                var tpl = optTpl.get();
                templateName = tpl.getName();
                mergeJsonVars(extraVars, tpl.getAnsibleVars());
                mergeJsonVars(extraVars, tpl.getVariables());
            }
        }

        Map<String, String> metadata = new HashMap<>();
        metadata.put("templateId", templateId != null ? templateId : "");
        metadata.put("templateName", templateName);
        metadata.put("serverIp", server.getIpAddress());

        var task = Task.builder()
            .serverId(serverId)
            .status("PENDING")
            .currentStep(0)
            .totalSteps(7)
            .metadata(toJson(metadata))
            .build();

        var createdTask = taskService.create(task);

        eventPublisher.publishGPUProvisionStarted(serverId);
        securityAuditService.logProvisionStart(serverId, "system", "api", templateId);

        extraVars.put("target_host", server.getIpAddress());
        extraVars.put("ansible_user", server.getUsername());
        extraVars.put("ansible_port", String.valueOf(server.getSshPort() != null ? server.getSshPort() : 22));

        taskExecutionService.executeProvision(createdTask.getId(), serverId, "playbooks/provision_gpu_node.yml", extraVars);

        return ResponseEntity.ok(Map.of(
            "taskId", createdTask.getId(),
            "status", "STARTED",
            "template", templateName,
            "message", "Provision started for server: " + serverId
        ));
    }

    @PostMapping("/{serverId}/rollback")
    public ResponseEntity<Map<String, String>> rollback(@PathVariable String serverId) {
        log.info("Starting rollback for server: {}", serverId);

        eventPublisher.publishRollbackTriggered(serverId, "User requested rollback");

        var latestTask = taskService.getLatestTask(serverId);
        if (latestTask.isPresent()) {
            latestTask.get().setStatus("ROLLING_BACK");
            taskService.update(latestTask.get());

            taskExecutionService.executeRollback(
                latestTask.get().getId(), serverId,
                "playbooks/rollback_gpu_node.yml", Map.of("target_host", serverId));
        }

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "ROLLBACK_STARTED",
            "message", "Rollback started for server: " + serverId
        ));
    }

    private void mergeJsonVars(Map<String, String> target, String jsonStr) {
        if (jsonStr == null || jsonStr.isBlank() || jsonStr.equals("{}")) return;
        try {
            String content = jsonStr.trim();
            if (content.startsWith("{")) content = content.substring(1);
            if (content.endsWith("}")) content = content.substring(0, content.length() - 1);
            for (String pair : content.split(",")) {
                String[] kv = pair.split(":", 2);
                if (kv.length == 2) {
                    String key = kv[0].trim().replace("\"", "");
                    String value = kv[1].trim().replace("\"", "");
                    if (!key.isEmpty()) target.put(key, value);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse JSON vars: {}", jsonStr, e);
        }
    }

    private String toJson(Map<String, String> map) {
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
    }
}
