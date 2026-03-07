package com.hypernode.provisioner.event;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.context.ApplicationEvent;

/**
 * Base class for domain events
 */
@Data
@EqualsAndHashCode(callSuper = false)
public abstract class DomainEvent extends ApplicationEvent {
    protected final String eventId;
    protected final String serverId;
    protected final long eventTime;

    protected DomainEvent(Object source, String eventId, String serverId) {
        super(source);
        this.eventId = eventId;
        this.serverId = serverId;
        this.eventTime = System.currentTimeMillis();
    }

    public long getEventTimeMillis() {
        return eventTime;
    }
}
