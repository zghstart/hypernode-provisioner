package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.Server;
import com.hypernode.provisioner.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ServerHealthCheckScheduler {

    private final ServerRepository serverRepository;
    private final SshConnectivityService sshConnectivityService;

    /**
     * 每 5 分钟巡检所有非下线状态的节点
     */
    @Scheduled(fixedDelay = 300_000, initialDelay = 60_000)
    public void healthCheckAll() {
        List<Server> servers = serverRepository.findAll().stream()
            .filter(s -> !"DEPROVISIONED".equals(s.getStatus()))
            .toList();

        if (servers.isEmpty()) return;

        log.info("Starting health check for {} servers", servers.size());
        int online = 0, offline = 0;

        for (Server server : servers) {
            try {
                var result = sshConnectivityService.testConnection(server.getId());
                if (Boolean.TRUE.equals(result.get("reachable"))) {
                    online++;
                } else {
                    offline++;
                }
            } catch (Exception e) {
                log.warn("Health check failed for server {}: {}", server.getIpAddress(), e.getMessage());
                server.setConnectStatus("OFFLINE");
                server.setLastCheckAt(LocalDateTime.now());
                serverRepository.save(server);
                offline++;
            }
        }
        log.info("Health check done: {} online, {} offline", online, offline);
    }
}
