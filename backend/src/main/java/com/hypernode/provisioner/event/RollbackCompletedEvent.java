package com.hypernode.provisioner.event;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Rollback Completed Event
 * 回滚完成事件
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class RollbackCompletedEvent extends DomainEvent {
    private Boolean success;

    public RollbackCompletedEvent(Object source, String eventId, String serverId, Boolean success) {
        super(source, eventId, serverId);
        this.success = success;
    }
}
