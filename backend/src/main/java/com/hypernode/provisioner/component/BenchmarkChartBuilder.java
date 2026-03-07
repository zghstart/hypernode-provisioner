package com.hypernode.provisioner.component;

import org.springframework.stereotype.Component;

/**
 * Benchmark Chart Data Builder
 * 构建图表所需的数据格式
 */
@Component
public class BenchmarkChartBuilder {

    /**
     * 构建 GPU 烤机图表数据
     */
    public GpuBurnChart buildGpuBurnChart() {
        GpuBurnChart chart = new GpuBurnChart();
        chart.setTitle("GPU 烤机测试 - 功耗与温度");
        chart.setxAxisLabel("时间 (秒)");
        chart.setyAxisLabel("功耗 (W) / 温度 (°C)");

        // 添加默认数据点
        chart.addPoint("0", 200, 45);
        chart.addPoint("60", 350, 65);
        chart.addPoint("120", 380, 72);
        chart.addPoint("180", 390, 78);
        chart.addPoint("240", 400, 82);
        chart.addPoint("300", 395, 80);

        return chart;
    }

    /**
     * 构建 NCCL 性能图表数据
     */
    public NcclChart buildNcclChart() {
        NcclChart chart = new NcclChart();
        chart.setTitle("NCCL 性能测试 - all_reduce");
        chart.setxAxisLabel("数据大小 (bytes)");
        chart.setyAxisLabel("吞吐量 (GB/s)");

        // 添加默认数据点
        chart.addPoint("1024", 10.5);
        chart.addPoint("4096", 25.2);
        chart.addPoint("16384", 45.8);
        chart.addPoint("65536", 68.5);
        chart.addPoint("262144", 85.2);
        chart.addPoint("1048576", 92.4);

        return chart;
    }

    /**
     * 构建进度图表数据
     */
    public ProgressChart buildProgressChart() {
        ProgressChart chart = new ProgressChart();
        chart.setTitle("部署进度");
        chart.setxAxisLabel("时间");
        chart.setyAxisLabel("进度 (%)");

        // 添加默认数据点
        chart.addPoint("0", 0);
        chart.addPoint("10", 15);
        chart.addPoint("20", 45);
        chart.addPoint("30", 70);
        chart.addPoint("40", 100);

        return chart;
    }

    // 内部数据类
    public static class GpuBurnChart {
        private String title;
        private String xAxisLabel;
        private String yAxisLabel;
        private final java.util.List<GpuBurnPoint> data = new java.util.ArrayList<>();

        public void addPoint(String time, double power, double temp) {
            data.add(new GpuBurnPoint(time, power, temp));
        }

        // Getters and setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getxAxisLabel() { return xAxisLabel; }
        public void setxAxisLabel(String xAxisLabel) { this.xAxisLabel = xAxisLabel; }
        public String getyAxisLabel() { return yAxisLabel; }
        public void setyAxisLabel(String yAxisLabel) { this.yAxisLabel = yAxisLabel; }
        public java.util.List<GpuBurnPoint> getData() { return data; }

        public static class GpuBurnPoint {
            private final String time;
            private final double power;
            private final double temp;

            public GpuBurnPoint(String time, double power, double temp) {
                this.time = time;
                this.power = power;
                this.temp = temp;
            }

            public String getTime() { return time; }
            public double getPower() { return power; }
            public double getTemp() { return temp; }
        }
    }

    public static class NcclChart {
        private String title;
        private String xAxisLabel;
        private String yAxisLabel;
        private final java.util.List<NcclPoint> data = new java.util.ArrayList<>();

        public void addPoint(String size, double throughput) {
            data.add(new NcclPoint(size, throughput));
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getxAxisLabel() { return xAxisLabel; }
        public void setxAxisLabel(String xAxisLabel) { this.xAxisLabel = xAxisLabel; }
        public String getyAxisLabel() { return yAxisLabel; }
        public void setyAxisLabel(String yAxisLabel) { this.yAxisLabel = yAxisLabel; }
        public java.util.List<NcclPoint> getData() { return data; }

        public static class NcclPoint {
            private final String size;
            private final double throughput;

            public NcclPoint(String size, double throughput) {
                this.size = size;
                this.throughput = throughput;
            }

            public String getSize() { return size; }
            public double getThroughput() { return throughput; }
        }
    }

    public static class ProgressChart {
        private String title;
        private String xAxisLabel;
        private String yAxisLabel;
        private final java.util.List<ProgressPoint> data = new java.util.ArrayList<>();

        public void addPoint(String time, double progress) {
            data.add(new ProgressPoint(time, progress));
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getxAxisLabel() { return xAxisLabel; }
        public void setxAxisLabel(String xAxisLabel) { this.xAxisLabel = xAxisLabel; }
        public String getyAxisLabel() { return yAxisLabel; }
        public void setyAxisLabel(String yAxisLabel) { this.yAxisLabel = yAxisLabel; }
        public java.util.List<ProgressPoint> getData() { return data; }

        public static class ProgressPoint {
            private final String time;
            private final double progress;

            public ProgressPoint(String time, double progress) {
                this.time = time;
                this.progress = progress;
            }

            public String getTime() { return time; }
            public double getProgress() { return progress; }
        }
    }
}
