package com.hypernode.provisioner.event;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Map;

/**
 * Benchmark Completed Event
 * 压测完成事件
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class BenchmarkCompletedEvent extends DomainEvent {
    private Map<String, Double> metrics;

    public BenchmarkCompletedEvent(Object source, String eventId, String serverId, Map<String, Double> metrics) {
        super(source, eventId, serverId);
        this.metrics = metrics;
    }
}
