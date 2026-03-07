package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.service.BenchmarkService;
import com.hypernode.provisioner.service.DcgmLogParser;
import com.hypernode.provisioner.service.RedisStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/benchmark")
@RequiredArgsConstructor
public class BenchmarkController {

    private final BenchmarkService benchmarkService;
    private final DcgmLogParser dcgmLogParser;
    private final RedisStreamService redisStreamService;

    @PostMapping("/start-gpu-burn")
    public ResponseEntity<Map<String, String>> startGpuBurn(@RequestBody Map<String, String> request) {
        String serverId = request.get("serverId");
        int duration = Integer.parseInt(request.getOrDefault("duration", "300"));

        log.info("Starting GPU burn test for server: {} (duration: {}s)", serverId, duration);
        benchmarkService.runGpuBurn(serverId, duration);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "duration", String.valueOf(duration),
            "message", "GPU burn test started"
        ));
    }

    @GetMapping("/gpu-burn-results/{serverId}")
    public ResponseEntity<Map<String, Object>> getGpuBurnResults(@PathVariable String serverId) {
        List<Map<String, Object>> metrics = benchmarkService.parseGpuBurnLog(serverId);

        if (metrics.isEmpty()) {
            String logPath = "/tmp/benchmark_results/gpu-burn.log";
            metrics = dcgmLogParser.parseSimpleDcgmFormat(logPath);
        }

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "metrics", metrics,
            "stats", dcgmLogParser.calculateMetricsStats(metrics)
        ));
    }

    @PostMapping("/start-nccl")
    public ResponseEntity<Map<String, String>> startNcclTest(@RequestBody Map<String, String> request) {
        String serverId = request.get("serverId");
        String testType = request.getOrDefault("testType", "all_reduce");

        log.info("Starting NCCL test for server: {} (type: {})", serverId, testType);
        benchmarkService.runNcclTest(serverId, testType);

        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "status", "RUNNING",
            "testType", testType,
            "message", "NCCL test started"
        ));
    }

    @GetMapping("/nccl-results/{serverId}")
    public ResponseEntity<Map<String, Object>> getNcclResults(@PathVariable String serverId) {
        List<Map<String, Object>> metrics = benchmarkService.parseNcclLog(serverId);
        return ResponseEntity.ok(Map.of(
            "serverId", serverId,
            "metrics", metrics
        ));
    }

    @GetMapping("/dcgm-data/{serverId}")
    public ResponseEntity<Map<String, Object>> getDcgmData(@PathVariable String serverId) {
        String logPath = "/tmp/benchmark_results/dcgm.log";
        List<Map<String, Object>> metrics = dcgmLogParser.parseSimpleDcgmFormat(logPath);
        Map<String, Object> stats = dcgmLogParser.calculateMetricsStats(metrics);
        return ResponseEntity.ok(Map.of(
            "serverId", serverId, "metrics", metrics, "stats", stats,
            "latestStatus", dcgmLogParser.getLatestGpuStatus(metrics)));
    }

    @GetMapping("/report/{serverId}")
    public ResponseEntity<Map<String, Object>> getPerformanceReport(@PathVariable String serverId) {
        return ResponseEntity.ok(benchmarkService.buildPerformanceReport(serverId));
    }
}
