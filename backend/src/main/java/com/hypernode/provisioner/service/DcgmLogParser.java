package com.hypernode.provisioner.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DCGM Log Parser
 * DCGM 监控日志解析器
 * 解析 GPU 功耗、温度等监控数据
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DcgmLogParser {

    private final ObjectMapper objectMapper;

    /**
     * 解析 DCGM 日志文件
     */
    public List<Map<String, Object>> parseDcgmLog(String logPath) {
        List<Map<String, Object>> metrics = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new FileReader(logPath))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("{")) {
                    try {
                        Map<String, Object> data = objectMapper.readValue(line, Map.class);
                        metrics.add(data);
                    } catch (Exception e) {
                        log.debug("Failed to parse line: {}", line);
                    }
                }
            }
        } catch (IOException e) {
            log.error("Failed to read DCGM log file: {}", logPath, e);
        }

        return metrics;
    }

    /**
     * 解析简化的 DCGM 日志格式
     * 格式: timestamp,device,power,temperature
     */
    public List<Map<String, Object>> parseSimpleDcgmFormat(String logPath) {
        List<Map<String, Object>> metrics = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new FileReader(logPath))) {
            String header = reader.readLine(); // Skip header
            String line;

            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(",");
                if (parts.length >= 4) {
                    Map<String, Object> data = new HashMap<>();
                    data.put("timestamp", parts[0]);
                    data.put("device", parts[1]);
                    data.put("powerWatts", Double.parseDouble(parts[2]));
                    data.put("temperatureCelsius", Integer.parseInt(parts[3]));
                    metrics.add(data);
                }
            }
        } catch (IOException e) {
            log.error("Failed to read DCGM log file: {}", logPath, e);
        }

        return metrics;
    }

    /**
     * 计算性能指标统计
     */
    public Map<String, Object> calculateMetricsStats(List<Map<String, Object>> metrics) {
        if (metrics.isEmpty()) {
            return Map.of("error", "No metrics data");
        }

        double totalPower = 0;
        double totalTemp = 0;
        int count = 0;

        for (Map<String, Object> metric : metrics) {
            if (metric.get("powerWatts") != null) {
                totalPower += (Double) metric.get("powerWatts");
            }
            if (metric.get("temperatureCelsius") != null) {
                totalTemp += (Double) metric.get("temperatureCelsius");
            }
            count++;
        }

        return Map.of(
            "averagePower", totalPower / count,
            "averageTemperature", totalTemp / count,
            "minPower", metrics.stream().mapToDouble(m -> (Double) m.getOrDefault("powerWatts", 0)).min().orElse(0),
            "maxPower", metrics.stream().mapToDouble(m -> (Double) m.getOrDefault("powerWatts", 0)).max().orElse(0),
            "minTemperature", metrics.stream().mapToDouble(m -> (Double) m.getOrDefault("temperatureCelsius", 0)).min().orElse(0),
            "maxTemperature", metrics.stream().mapToDouble(m -> (Double) m.getOrDefault("temperatureCelsius", 0)).max().orElse(0),
            "totalRecords", count
        );
    }

    /**
     * 获取最近的 GPU 状态
     */
    public Map<String, Object> getLatestGpuStatus(List<Map<String, Object>> metrics) {
        if (metrics.isEmpty()) {
            return Map.of();
        }
        return metrics.get(metrics.size() - 1);
    }
}
