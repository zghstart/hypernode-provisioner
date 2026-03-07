package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.Task;
import com.hypernode.provisioner.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Task Service Test
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private TaskService taskService;

    @Test
    void shouldCreateTask() {
        // Given
        Task task = Task.builder()
            .serverId("server-123")
            .status("PENDING")
            .currentStep(0)
            .totalSteps(7)
            .build();

        when(taskRepository.save(any(Task.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Task saved = taskService.create(task);

        // Then
        assertThat(saved.getId()).isNull(); // Will be set by repository
        assertThat(saved.getServerId()).isEqualTo("server-123");
        assertThat(saved.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void shouldGetTaskById() {
        // Given
        Task task = Task.builder()
            .id("task-123")
            .serverId("server-123")
            .status("RUNNING")
            .build();

        when(taskRepository.findById("task-123")).thenReturn(Optional.of(task));

        // When
        Optional<Task> found = taskService.getById("task-123");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo("task-123");
    }

    @Test
    void shouldUpdateTaskProgress() {
        // Given
        Task task = Task.builder()
            .id("task-123")
            .serverId("server-123")
            .currentStep(0)
            .totalSteps(7)
            .build();

        when(taskRepository.findById("task-123")).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Task updated = taskService.updateProgress("task-123", 3, 7);

        // Then
        assertThat(updated.getCurrentStep()).isEqualTo(3);
        assertThat(updated.getTotalSteps()).isEqualTo(7);
    }
}
