package com.hypernode.provisioner.event;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Benchmark Started Event
 * 压测开始事件
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class BenchmarkStartedEvent extends DomainEvent {
    private String benchmarkType;

    public BenchmarkStartedEvent(Object source, String eventId, String serverId, String benchmarkType) {
        super(source, eventId, serverId);
        this.benchmarkType = benchmarkType;
    }
}
