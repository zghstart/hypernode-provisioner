package com.hypernode.provisioner.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskExecutionService {

    private final AnsibleProcessService ansibleProcessService;
    private final RedisStreamService redisStreamService;
    private final TaskService taskService;

    private static final String[] PROVISION_STEPS = {
        "DISABLE_NOUVEAU", "CONFIGURE_APT", "INSTALL_DRIVER",
        "INSTALL_CUDA", "CONFIGURE_ENV", "ENABLE_PERSISTENCE", "NETWORK_TUNING"
    };

    @Async
    public CompletableFuture<Void> executeProvision(String taskId, String serverId,
                                                     String playbookPath, Map<String, String> extraVars) {
        log.info("Starting provision task: {} for server: {} playbook: {}", taskId, serverId, playbookPath);

        try {
            taskService.getById(taskId).ifPresent(t -> {
                t.setStatus("RUNNING");
                t.setStartedAt(java.time.LocalDateTime.now());
                taskService.update(t);
            });

            redisStreamService.sendProgress(taskId, 0, PROVISION_STEPS.length);

            Process process = ansibleProcessService.executePlaybook(
                playbookPath, "playbooks/hosts", extraVars);

            monitorProcess(taskId, process);

            int exitCode = process.waitFor();
            if (exitCode == 0) {
                redisStreamService.sendCompleted(taskId, true, "Provision completed successfully");
                taskService.getById(taskId).ifPresent(t -> {
                    t.setStatus("COMPLETED");
                    t.setCurrentStep(PROVISION_STEPS.length);
                    t.setCompletedAt(java.time.LocalDateTime.now());
                    taskService.update(t);
                });
            } else {
                redisStreamService.sendFailed(taskId, "Ansible exited with code " + exitCode, null);
                taskService.getById(taskId).ifPresent(t -> {
                    t.setStatus("FAILED");
                    t.setCompletedAt(java.time.LocalDateTime.now());
                    taskService.update(t);
                });
            }

            redisStreamService.saveTaskResult(taskId, Map.of(
                "status", exitCode == 0 ? "COMPLETED" : "FAILED",
                "serverId", serverId,
                "taskId", taskId,
                "exitCode", String.valueOf(exitCode)
            ));

        } catch (Exception e) {
            log.error("Provision failed for task: {}", taskId, e);
            redisStreamService.sendFailed(taskId, e.getMessage(), e);
            taskService.getById(taskId).ifPresent(t -> {
                t.setStatus("FAILED");
                t.setCompletedAt(java.time.LocalDateTime.now());
                taskService.update(t);
            });
        }

        return CompletableFuture.completedFuture(null);
    }

    @Async
    public CompletableFuture<Void> executeRollback(String taskId, String serverId,
                                                    String playbookPath, Map<String, String> extraVars) {
        log.info("Starting rollback task: {} for server: {}", taskId, serverId);

        try {
            redisStreamService.sendProgress(taskId, 0, 6);

            Process process = ansibleProcessService.executePlaybook(
                playbookPath, "playbooks/hosts", extraVars);

            monitorProcess(taskId, process);

            int exitCode = process.waitFor();
            String msg = exitCode == 0 ? "Rollback completed successfully" : "Rollback failed with code " + exitCode;
            redisStreamService.sendCompleted(taskId, exitCode == 0, msg);

            taskService.getById(taskId).ifPresent(t -> {
                t.setStatus(exitCode == 0 ? "ROLLED_BACK" : "FAILED");
                t.setCompletedAt(java.time.LocalDateTime.now());
                taskService.update(t);
            });

        } catch (Exception e) {
            log.error("Rollback failed for task: {}", taskId, e);
            redisStreamService.sendFailed(taskId, e.getMessage(), e);
        }

        return CompletableFuture.completedFuture(null);
    }

    private void monitorProcess(String taskId, Process process) {
        try (var reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            int detectedStep = 0;
            while ((line = reader.readLine()) != null) {
                log.debug("[Ansible:{}] {}", taskId, line);
                int step = detectStep(line);
                if (step > detectedStep) {
                    detectedStep = step;
                    redisStreamService.sendProgress(taskId, detectedStep, PROVISION_STEPS.length);
                    taskService.updateProgress(taskId, detectedStep, PROVISION_STEPS.length);
                }
            }
        } catch (Exception e) {
            log.warn("Error reading process output for task: {}", taskId, e);
        }
    }

    private int detectStep(String line) {
        if (line == null) return 0;
        String lower = line.toLowerCase();
        if (lower.contains("nouveau") || lower.contains("blacklist")) return 1;
        if (lower.contains("apt") && (lower.contains("source") || lower.contains("mirror") || lower.contains("cuda-keyring"))) return 2;
        if (lower.contains("nvidia-driver") || lower.contains("fabricmanager")) return 3;
        if (lower.contains("cuda-toolkit") || lower.contains("cuda_toolkit")) return 4;
        if (lower.contains("profile.d") || lower.contains("cuda.sh") || lower.contains("ld_library")) return 5;
        if (lower.contains("persistenc") || lower.contains("nvidia-smi")) return 6;
        if (lower.contains("irqbalance") || lower.contains("mlnx_tune") || lower.contains("network")) return 7;
        return 0;
    }
}
