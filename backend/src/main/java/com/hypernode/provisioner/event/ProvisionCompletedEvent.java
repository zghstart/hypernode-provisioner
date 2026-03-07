package com.hypernode.provisioner.event;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Provision Completed Event
 * 部署完成事件
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ProvisionCompletedEvent extends DomainEvent {
    private Boolean success;
    private String message;

    public ProvisionCompletedEvent(Object source, String eventId, String serverId, Boolean success, String message) {
        super(source, eventId, serverId);
        this.success = success;
        this.message = message;
    }
}
