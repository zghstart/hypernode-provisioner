package com.hypernode.provisioner.event;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Rollback Triggered Event
 * 回滚触发事件
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class RollbackTriggeredEvent extends DomainEvent {
    private String reason;

    public RollbackTriggeredEvent(Object source, String eventId, String serverId, String reason) {
        super(source, eventId, serverId);
        this.reason = reason;
    }
}
