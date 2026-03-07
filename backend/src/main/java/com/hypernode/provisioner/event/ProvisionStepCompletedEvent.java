package com.hypernode.provisioner.event;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Provision Step Completed Event
 * 部署步骤完成事件
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ProvisionStepCompletedEvent extends DomainEvent {
    private int step;
    private String stepName;

    public ProvisionStepCompletedEvent(Object source, String eventId, String serverId, int step, String stepName) {
        super(source, eventId, serverId);
        this.step = step;
        this.stepName = stepName;
    }
}
