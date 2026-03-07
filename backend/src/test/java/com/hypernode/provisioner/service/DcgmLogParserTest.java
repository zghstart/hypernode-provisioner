package com.hypernode.provisioner.service;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * DCGM Log Parser Test
 */
class DcgmLogParserTest {

    private final DcgmLogParser parser = new DcgmLogParser();

    @Test
    void shouldParseEmptyLog() {
        // Given / When
        var result = parser.parseSimpleDcgmFormat("/nonexistent/path.log");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    void shouldCalculateMetricsStats() {
        // Given
        var metrics = java.util.List.of(
            createMetric(350.0, 75.0),
            createMetric(380.0, 78.0)
        );

        // When
        var stats = parser.calculateMetricsStats(metrics);

        // Then
        assertThat(stats).isNotNull();
        assertThat(stats.get("averagePower")).isEqualTo(365.0);
        assertThat(stats.get("totalRecords")).isEqualTo(2);
    }

    private Map<String, Object> createMetric(double power, double temp) {
        var map = new HashMap<String, Object>();
        map.put("powerWatts", power);
        map.put("temperatureCelsius", temp);
        return map;
    }
}
