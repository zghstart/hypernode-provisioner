package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.Task;
import com.hypernode.provisioner.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

/**
 * Task Service
 * 任务管理服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ObjectMapper objectMapper;

    /**
     * 获取所有任务
     */
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    /**
     * 根据 ID 获取任务
     */
    public Optional<Task> getById(String id) {
        return taskRepository.findById(id);
    }

    /**
     * 根据服务器 ID 获取任务列表
     */
    public List<Task> getByServerId(String serverId) {
        return taskRepository.findByServerId(serverId);
    }

    /**
     * 创建任务
     */
    public Task create(Task task) {
        task.setId(null);
        return taskRepository.save(task);
    }

    /**
     * 更新任务
     */
    public Task update(Task task) {
        return taskRepository.save(task);
    }

    /**
     * 删除任务
     */
    public void delete(String id) {
        taskRepository.deleteById(id);
    }

    /**
     * 根据状态获取任务列表
     */
    public List<Task> getByStatus(String status) {
        return taskRepository.findByStatus(status);
    }

    /**
     * 获取最新的任务
     */
    public Optional<Task> getLatestTask(String serverId) {
        return taskRepository.findTopByServerIdOrderByCreatedAtDesc(serverId);
    }

    /**
     * 设置任务为强制执行模式（覆盖异常状态，需配合审计）
     */
    public Task setForceRun(String taskId, boolean forceRun) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));
        task.setForceRun(forceRun);
        return taskRepository.save(task);
    }

    /**
     * 更新任务进度（无 metadata）
     */
    public Task updateProgress(String taskId, Integer currentStep, Integer totalSteps) {
        return updateProgress(taskId, currentStep, totalSteps, null);
    }

    /**
     * 更新任务进度
     */
    public Task updateProgress(String taskId, Integer currentStep, Integer totalSteps,
                                Map<String, Object> metadata) {
        Optional<Task> optionalTask = taskRepository.findById(taskId);
        if (optionalTask.isPresent()) {
            Task task = optionalTask.get();
            task.setCurrentStep(currentStep);
            task.setTotalSteps(totalSteps);
            if (metadata != null) {
                try {
                    // 将 metadata 转换为 JSON 字符串存储
                    String currentMetadata = task.getMetadata();
                    Map<String, Object> currentMap = objectMapper.readValue(
                        currentMetadata, new TypeReference<Map<String, Object>>() {});
                    currentMap.putAll(metadata);
                    task.setMetadata(objectMapper.writeValueAsString(currentMap));
                } catch (Exception e) {
                    log.error("Failed to update metadata", e);
                }
            }
            return taskRepository.save(task);
        }
        throw new RuntimeException("Task not found: " + taskId);
    }
}
