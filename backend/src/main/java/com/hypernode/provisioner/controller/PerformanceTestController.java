package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.entity.PerformanceTestResult;
import com.hypernode.provisioner.service.PerformanceTestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 性能测试控制器
 * 提供性能测试相关的 RESTful API
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/performance")
@RequiredArgsConstructor
public class PerformanceTestController {

    private final PerformanceTestService performanceTestService;

    /**
     * 执行环境检查测试
     */
    @PostMapping("/env-check")
    public ResponseEntity<Map<String, String>> runEnvironmentCheck(@RequestBody Map<String, String> request) {
        String serverId = request.get("serverId");
        if (serverId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Server ID is required"));
        }

        log.info("Starting environment check for server: {}", serverId);
        performanceTestService.runEnvironmentCheck(serverId);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "message", "Environment check started"
        ));
    }

    /**
     * 执行 GEMM 测试
     */
    @PostMapping("/gemm")
    public ResponseEntity<Map<String, String>> runGemmTest(@RequestBody Map<String, Object> request) {
        String serverId = (String) request.get("serverId");
        if (serverId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Server ID is required"));
        }

        Map<String, Object> config = new java.util.HashMap<>();
        if (request.containsKey("matrixSize")) {
            config.put("matrix_size", request.get("matrixSize"));
        }

        log.info("Starting GEMM test for server: {}", serverId);
        performanceTestService.runGemmTest(serverId, config);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "message", "GEMM test started"
        ));
    }

    /**
     * 执行显存带宽测试
     */
    @PostMapping("/memory-bandwidth")
    public ResponseEntity<Map<String, String>> runMemoryBandwidthTest(@RequestBody Map<String, String> request) {
        String serverId = request.get("serverId");
        if (serverId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Server ID is required"));
        }

        log.info("Starting memory bandwidth test for server: {}", serverId);
        performanceTestService.runMemoryBandwidthTest(serverId);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "message", "Memory bandwidth test started"
        ));
    }

    /**
     * 执行磁盘 I/O 测试
     */
    @PostMapping("/disk-io")
    public ResponseEntity<Map<String, String>> runDiskIOTest(@RequestBody Map<String, String> request) {
        String serverId = request.get("serverId");
        if (serverId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Server ID is required"));
        }

        log.info("Starting disk I/O test for server: {}", serverId);
        performanceTestService.runDiskIOTest(serverId);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "message", "Disk I/O test started"
        ));
    }

    /**
     * 执行 GPU 拓扑测试
     */
    @PostMapping("/gpu-topology")
    public ResponseEntity<Map<String, String>> runGpuTopologyTest(@RequestBody Map<String, String> request) {
        String serverId = request.get("serverId");
        if (serverId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Server ID is required"));
        }

        log.info("Starting GPU topology test for server: {}", serverId);
        performanceTestService.runGpuTopologyTest(serverId);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "message", "GPU topology test started"
        ));
    }

    /**
     * 执行 NCCL 测试
     */
    @PostMapping("/nccl")
    public ResponseEntity<Map<String, String>> runNcclTest(@RequestBody Map<String, Object> request) {
        String serverId = (String) request.get("serverId");
        if (serverId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Server ID is required"));
        }

        Map<String, Object> config = new java.util.HashMap<>();
        if (request.containsKey("testType")) {
            config.put("test_type", request.get("testType"));
        }

        log.info("Starting NCCL test for server: {}", serverId);
        performanceTestService.runNcclTest(serverId, config);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "message", "NCCL test started"
        ));
    }

    /**
     * 执行 GPU-Burn 测试
     */
    @PostMapping("/gpu-burn")
    public ResponseEntity<Map<String, String>> runGpuBurnTest(@RequestBody Map<String, Object> request) {
        String serverId = (String) request.get("serverId");
        if (serverId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Server ID is required"));
        }

        int duration = request.containsKey("duration") ? (int) request.get("duration") : 120;

        log.info("Starting GPU burn test for server: {} (duration: {}s)", serverId, duration);
        performanceTestService.runGpuBurnTest(serverId, duration);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "duration", String.valueOf(duration),
            "message", "GPU burn test started"
        ));
    }

    /**
     * 执行 Transformer 推理测试
     */
    @PostMapping("/inference")
    public ResponseEntity<Map<String, String>> runInferenceTest(@RequestBody Map<String, String> request) {
        String serverId = request.get("serverId");
        if (serverId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Server ID is required"));
        }

        log.info("Starting inference test for server: {}", serverId);
        performanceTestService.runInferenceTest(serverId);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "message", "Inference test started"
        ));
    }

    /**
     * 执行全部测试
     */
    @PostMapping("/run-all")
    public ResponseEntity<Map<String, String>> runAllTests(@RequestBody Map<String, String> request) {
        String serverId = request.get("serverId");
        if (serverId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Server ID is required"));
        }

        log.info("Starting all tests for server: {}", serverId);
        performanceTestService.runAllTests(serverId);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "message", "All tests started"
        ));
    }

    /**
     * 获取测试结果列表
     */
    @GetMapping("/results/{serverId}")
    public ResponseEntity<List<PerformanceTestResult>> getTestResults(@PathVariable String serverId) {
        List<PerformanceTestResult> results = performanceTestService.getTestResults(serverId);
        return ResponseEntity.ok(results);
    }

    /**
     * 获取测试结果详情
     */
    @GetMapping("/result/{id}")
    public ResponseEntity<PerformanceTestResult> getTestResultById(@PathVariable String id) {
        return performanceTestService.getTestResultById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
