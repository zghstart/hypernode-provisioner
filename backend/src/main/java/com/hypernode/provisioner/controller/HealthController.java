package com.hypernode.provisioner.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Health Controller
 * 健康检查接口
 */
@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "hypernode-provisioner");
        return status;
    }

    @GetMapping("/ready")
    public Map<String, String> ready() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "READY");
        status.put("service", "hypernode-provisioner");
        return status;
    }
}
