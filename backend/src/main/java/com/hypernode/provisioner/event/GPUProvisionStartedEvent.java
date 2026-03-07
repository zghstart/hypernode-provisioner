package com.hypernode.provisioner.event;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Map;

/**
 * GPU Provision Started Event
 * GPU 节点部署开始事件
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class GPUProvisionStartedEvent extends DomainEvent {
    private Map<String, Object> context;

    public GPUProvisionStartedEvent(Object source, String eventId, String serverId, Map<String, Object> context) {
        super(source, eventId, serverId);
        this.context = context;
    }
}
