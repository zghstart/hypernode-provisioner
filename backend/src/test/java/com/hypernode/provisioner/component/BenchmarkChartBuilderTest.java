package com.hypernode.provisioner.component;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Benchmark Chart Builder Test
 */
class BenchmarkChartBuilderTest {

    private final BenchmarkChartBuilder builder = new BenchmarkChartBuilder();

    @Test
    void shouldBuildGpuBurnChart() {
        // When
        var chart = builder.buildGpuBurnChart();

        // Then
        assertThat(chart.getTitle()).isNotBlank();
        assertThat(chart.getData()).isNotEmpty();
        assertThat(chart.getData()).hasSize(6);
    }

    @Test
    void shouldBuildNcclChart() {
        // When
        var chart = builder.buildNcclChart();

        // Then
        assertThat(chart.getTitle()).isNotBlank();
        assertThat(chart.getData()).isNotEmpty();
        assertThat(chart.getData()).hasSize(6);
    }

    @Test
    void shouldBuildProgressChart() {
        // When
        var chart = builder.buildProgressChart();

        // Then
        assertThat(chart.getTitle()).isNotBlank();
        assertThat(chart.getData()).isNotEmpty();
        assertThat(chart.getData()).hasSize(5);
    }
}
