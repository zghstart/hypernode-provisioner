package com.hypernode.provisioner.consumer;

import com.hypernode.provisioner.service.RedisStreamService;
import com.hypernode.provisioner.event.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Event Consumer
 * 领域事件监听器
 * 将领域事件转换为 Redis Stream 事件
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EventConsumer {

    private final RedisStreamService redisStreamService;

    @Async
    @EventListener
    public void onGPUProvisionStarted(GPUProvisionStartedEvent event) {
        log.info("GPU provision started for server: {}", event.getServerId());
        redisStreamService.sendEvent(
            event.getServerId(),
            "provision_started",
            Map.of("serverId", event.getServerId(), "timestamp", event.getEventTimeMillis())
        );
    }

    @Async
    @EventListener
    public void onProvisionStepCompleted(ProvisionStepCompletedEvent event) {
        log.info("Provision step completed for server: {} - step {}", event.getServerId(), event.getStep());
        redisStreamService.sendEvent(
            event.getServerId(),
            "step_completed",
            Map.of(
                "serverId", event.getServerId(),
                "step", event.getStep(),
                "stepName", event.getStepName(),
                "timestamp", event.getEventTimeMillis()
            )
        );
    }

    @Async
    @EventListener
    public void onProvisionStepFailed(ProvisionStepFailedEvent event) {
        log.error("Provision step failed for server: {} - step {}", event.getServerId(), event.getStep());
        redisStreamService.sendEvent(
            event.getServerId(),
            "step_failed",
            Map.of(
                "serverId", event.getServerId(),
                "step", event.getStep(),
                "stepName", event.getStepName(),
                "error", event.getError(),
                "stacktrace", event.getStacktrace(),
                "timestamp", event.getEventTimeMillis()
            )
        );
    }

    @Async
    @EventListener
    public void onProvisionCompleted(ProvisionCompletedEvent event) {
        log.info("Provision completed for server: {} - success: {}", event.getServerId(), event.getSuccess());
        redisStreamService.sendEvent(
            event.getServerId(),
            "provision_completed",
            Map.of(
                "serverId", event.getServerId(),
                "success", event.getSuccess(),
                "message", event.getMessage(),
                "timestamp", event.getEventTimeMillis()
            )
        );
    }

    @Async
    @EventListener
    public void onBenchmarkStarted(BenchmarkStartedEvent event) {
        log.info("Benchmark started for server: {} - type: {}", event.getServerId(), event.getBenchmarkType());
        redisStreamService.sendEvent(
            event.getServerId(),
            "benchmark_started",
            Map.of(
                "serverId", event.getServerId(),
                "benchmarkType", event.getBenchmarkType(),
                "timestamp", event.getEventTimeMillis()
            )
        );
    }

    @Async
    @EventListener
    public void onBenchmarkCompleted(BenchmarkCompletedEvent event) {
        log.info("Benchmark completed for server: {}", event.getServerId());
        redisStreamService.sendEvent(
            event.getServerId(),
            "benchmark_completed",
            Map.of(
                "serverId", event.getServerId(),
                "metrics", event.getMetrics(),
                "timestamp", event.getEventTimeMillis()
            )
        );
    }

    @Async
    @EventListener
    public void onRollbackTriggered(RollbackTriggeredEvent event) {
        log.info("Rollback triggered for server: {} - reason: {}", event.getServerId(), event.getReason());
        redisStreamService.sendEvent(
            event.getServerId(),
            "rollback_triggered",
            Map.of(
                "serverId", event.getServerId(),
                "reason", event.getReason(),
                "timestamp", event.getEventTimeMillis()
            )
        );
    }

    @Async
    @EventListener
    public void onRollbackCompleted(RollbackCompletedEvent event) {
        log.info("Rollback completed for server: {} - success: {}", event.getServerId(), event.getSuccess());
        redisStreamService.sendEvent(
            event.getServerId(),
            "rollback_completed",
            Map.of(
                "serverId", event.getServerId(),
                "success", event.getSuccess(),
                "timestamp", event.getEventTimeMillis()
            )
        );
    }
}
