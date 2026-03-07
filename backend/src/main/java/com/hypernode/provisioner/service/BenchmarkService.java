package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.Server;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class BenchmarkService {

    private final AnsibleProcessService ansibleProcessService;
    private final ServerService serverService;
    private final RedisStreamService redisStreamService;

    private static final String RESULTS_DIR = "/tmp/hypernode-benchmark";

    @Async
    public CompletableFuture<Map<String, Object>> runGpuBurn(String serverId, int duration) {
        log.info("Starting GPU burn for server {} with duration {}s", serverId, duration);
        var server = serverService.getById(serverId);
        if (server.isEmpty()) {
            return CompletableFuture.completedFuture(Map.of("error", "Server not found"));
        }

        var sv = server.get();
        String outputDir = RESULTS_DIR + "/" + serverId;

        try {
            Files.createDirectories(Path.of(outputDir));

            Map<String, String> extraVars = new HashMap<>();
            extraVars.put("target_host", sv.getIpAddress());
            extraVars.put("ansible_user", sv.getUsername());
            extraVars.put("gpu_burn_duration", String.valueOf(duration));
            extraVars.put("output_dir", outputDir);

            redisStreamService.sendEvent(serverId, "gpu_burn_started",
                Map.of("serverId", serverId, "duration", duration));

            Process proc = ansibleProcessService.executePlaybook(
                "playbooks/benchmark_gpu_burn.yml", "playbooks/hosts", extraVars);

            int exitCode = proc.waitFor();

            var result = new HashMap<String, Object>();
            result.put("serverId", serverId);
            result.put("exitCode", exitCode);
            result.put("outputDir", outputDir);
            result.put("status", exitCode == 0 ? "COMPLETED" : "FAILED");

            redisStreamService.sendEvent(serverId, "gpu_burn_completed",
                Map.of("serverId", serverId, "exitCode", exitCode));

            return CompletableFuture.completedFuture(result);
        } catch (Exception e) {
            log.error("GPU burn failed for server {}", serverId, e);
            return CompletableFuture.completedFuture(Map.of("error", e.getMessage()));
        }
    }

    @Async
    public CompletableFuture<Map<String, Object>> runNcclTest(String serverId, String testType) {
        log.info("Starting NCCL {} test for server {}", testType, serverId);
        var server = serverService.getById(serverId);
        if (server.isEmpty()) {
            return CompletableFuture.completedFuture(Map.of("error", "Server not found"));
        }

        var sv = server.get();
        String outputDir = RESULTS_DIR + "/" + serverId;

        try {
            Files.createDirectories(Path.of(outputDir));

            Map<String, String> extraVars = new HashMap<>();
            extraVars.put("target_host", sv.getIpAddress());
            extraVars.put("ansible_user", sv.getUsername());
            extraVars.put("nccl_test_type", testType);
            extraVars.put("output_dir", outputDir);

            redisStreamService.sendEvent(serverId, "nccl_test_started",
                Map.of("serverId", serverId, "testType", testType));

            Process proc = ansibleProcessService.executePlaybook(
                "playbooks/benchmark_nccl.yml", "playbooks/hosts", extraVars);

            int exitCode = proc.waitFor();

            redisStreamService.sendEvent(serverId, "nccl_test_completed",
                Map.of("serverId", serverId, "exitCode", exitCode));

            return CompletableFuture.completedFuture(Map.of(
                "serverId", serverId,
                "exitCode", exitCode,
                "outputDir", outputDir,
                "status", exitCode == 0 ? "COMPLETED" : "FAILED"
            ));
        } catch (Exception e) {
            log.error("NCCL test failed for server {}", serverId, e);
            return CompletableFuture.completedFuture(Map.of("error", e.getMessage()));
        }
    }

    public List<Map<String, Object>> parseGpuBurnLog(String serverId) {
        Path logFile = Path.of(RESULTS_DIR, serverId, "gpu-burn.log");
        if (!Files.exists(logFile)) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> metrics = new ArrayList<>();
        try (var reader = Files.newBufferedReader(logFile)) {
            String line;
            int tick = 0;
            while ((line = reader.readLine()) != null) {
                if (line.contains("GPU") && (line.contains("W") || line.contains("C"))) {
                    var entry = parseGpuBurnLine(line, tick++);
                    if (entry != null) metrics.add(entry);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse gpu-burn log for {}", serverId, e);
        }
        return metrics;
    }

    public List<Map<String, Object>> parseNcclLog(String serverId) {
        Path logFile = Path.of(RESULTS_DIR, serverId, "nccl-results.log");
        if (!Files.exists(logFile)) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> metrics = new ArrayList<>();
        try (var reader = Files.newBufferedReader(logFile)) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.matches(".*\\d+\\s+\\d+.*float.*")) {
                    var entry = parseNcclLine(line);
                    if (entry != null) metrics.add(entry);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse nccl log for {}", serverId, e);
        }
        return metrics;
    }

    public Map<String, Object> buildPerformanceReport(String serverId) {
        var gpuMetrics = parseGpuBurnLog(serverId);
        var ncclMetrics = parseNcclLog(serverId);

        var report = new HashMap<String, Object>();
        report.put("serverId", serverId);
        report.put("timestamp", System.currentTimeMillis());

        if (!gpuMetrics.isEmpty()) {
            double avgPower = gpuMetrics.stream()
                .mapToDouble(m -> ((Number) m.getOrDefault("power", 0)).doubleValue())
                .average().orElse(0);
            double avgTemp = gpuMetrics.stream()
                .mapToDouble(m -> ((Number) m.getOrDefault("temp", 0)).doubleValue())
                .average().orElse(0);
            report.put("gpuBurn", Map.of(
                "status", "completed", "averagePower", Math.round(avgPower * 10) / 10.0,
                "averageTemp", Math.round(avgTemp * 10) / 10.0, "samples", gpuMetrics.size()));
        } else {
            report.put("gpuBurn", Map.of("status", "no_data", "averagePower", 0, "averageTemp", 0));
        }

        if (!ncclMetrics.isEmpty()) {
            double avgAllReduce = ncclMetrics.stream()
                .mapToDouble(m -> ((Number) m.getOrDefault("all_reduce", 0)).doubleValue())
                .average().orElse(0);
            double avgBroadcast = ncclMetrics.stream()
                .mapToDouble(m -> ((Number) m.getOrDefault("broadcast", 0)).doubleValue())
                .average().orElse(0);
            report.put("nccl", Map.of(
                "status", "completed",
                "allReduceAvg", String.format("%.1f GB/s", avgAllReduce),
                "broadcastAvg", String.format("%.1f GB/s", avgBroadcast)));
        } else {
            report.put("nccl", Map.of("status", "no_data", "allReduceAvg", "—", "broadcastAvg", "—"));
        }

        report.put("nvlink", Map.of("status", "pending", "bandwidth", "—"));

        return report;
    }

    private Map<String, Object> parseGpuBurnLine(String line, int tick) {
        try {
            var m = new HashMap<String, Object>();
            m.put("time", String.valueOf(tick * 10));
            String[] tokens = line.trim().split("\\s+");
            for (int i = 0; i < tokens.length; i++) {
                if (tokens[i].endsWith("W") && i > 0) {
                    m.put("power", Double.parseDouble(tokens[i].replace("W", "")));
                }
                if (tokens[i].endsWith("C") && i > 0) {
                    m.put("temp", Double.parseDouble(tokens[i].replace("C", "")));
                }
            }
            if (m.containsKey("power") || m.containsKey("temp")) return m;
        } catch (Exception ignored) {}
        return null;
    }

    private Map<String, Object> parseNcclLine(String line) {
        try {
            String[] tokens = line.trim().split("\\s+");
            if (tokens.length >= 8) {
                return Map.of(
                    "size", tokens[0],
                    "time", tokens[1],
                    "all_reduce", Double.parseDouble(tokens[tokens.length - 2]),
                    "broadcast", Double.parseDouble(tokens[tokens.length - 1])
                );
            }
        } catch (Exception ignored) {}
        return null;
    }
}
