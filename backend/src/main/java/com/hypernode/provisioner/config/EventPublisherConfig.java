package com.hypernode.provisioner.config;

import com.hypernode.provisioner.event.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * Event Publisher Configuration
 * 领域事件发布器配置
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class EventPublisherConfig {

    private final ApplicationEventPublisher eventPublisher;

    @Bean
    public DomainEventPublisher domainEventPublisher() {
        return new DomainEventPublisher(eventPublisher);
    }

    /**
     * 领域事件发布器
     */
    public static class DomainEventPublisher {
        private final ApplicationEventPublisher publisher;

        public DomainEventPublisher(ApplicationEventPublisher publisher) {
            this.publisher = publisher;
        }

        public void publish(DomainEvent event) {
            log.debug("Publishing domain event: {} for server: {}",
                event.getClass().getSimpleName(), event.getServerId());
            publisher.publishEvent(event);
        }

        public void publishGPUProvisionStarted(String serverId) {
            publish(new GPUProvisionStartedEvent(
                this,
                java.util.UUID.randomUUID().toString(),
                serverId,
                Map.of()
            ));
        }

        public void publishProvisionStepCompleted(String serverId, int step, String stepName) {
            publish(new ProvisionStepCompletedEvent(
                this,
                java.util.UUID.randomUUID().toString(),
                serverId,
                step,
                stepName
            ));
        }

        public void publishProvisionStepFailed(String serverId, int step, String stepName,
                                               String error, String stacktrace) {
            publish(new ProvisionStepFailedEvent(
                this,
                java.util.UUID.randomUUID().toString(),
                serverId,
                step,
                stepName,
                error,
                stacktrace
            ));
        }

        public void publishProvisionCompleted(String serverId, boolean success, String message) {
            publish(new ProvisionCompletedEvent(
                this,
                java.util.UUID.randomUUID().toString(),
                serverId,
                success,
                message
            ));
        }

        public void publishBenchmarkStarted(String serverId, String benchmarkType) {
            publish(new BenchmarkStartedEvent(
                this,
                java.util.UUID.randomUUID().toString(),
                serverId,
                benchmarkType
            ));
        }

        public void publishBenchmarkCompleted(String serverId, java.util.Map<String, Double> metrics) {
            publish(new BenchmarkCompletedEvent(
                this,
                java.util.UUID.randomUUID().toString(),
                serverId,
                metrics
            ));
        }

        public void publishRollbackTriggered(String serverId, String reason) {
            publish(new RollbackTriggeredEvent(
                this,
                java.util.UUID.randomUUID().toString(),
                serverId,
                reason
            ));
        }

        public void publishRollbackCompleted(String serverId, boolean success) {
            publish(new RollbackCompletedEvent(
                this,
                java.util.UUID.randomUUID().toString(),
                serverId,
                success
            ));
        }
    }
}
