package com.hypernode.provisioner.event;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Provision Step Failed Event
 * 部署步骤失败事件
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ProvisionStepFailedEvent extends DomainEvent {
    private int step;
    private String stepName;
    private String error;
    private String stacktrace;

    public ProvisionStepFailedEvent(Object source, String eventId, String serverId, int step, String stepName, String error, String stacktrace) {
        super(source, eventId, serverId);
        this.step = step;
        this.stepName = stepName;
        this.error = error;
        this.stacktrace = stacktrace;
    }
}
