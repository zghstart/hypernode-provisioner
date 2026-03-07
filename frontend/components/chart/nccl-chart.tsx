"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface NcclChartProps {
  data: Array<{ size: string; throughput: number }>
}

export function NcclChart({ data }: NcclChartProps) {
  return (
    <div className="w-full space-y-4">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="size"
            type="number"
            scale="log"
            label={{ value: '数据大小 (bytes, log scale)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            unit="GB/s"
            label={{ value: '吞吐量', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="throughput"
            stroke="#8884d8"
            name="all_reduce 吞吐量"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
