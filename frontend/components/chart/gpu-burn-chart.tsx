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

interface GpuBurnChartProps {
  data: Array<{ time: string; power: number; temp: number }>
}

export function GpuBurnChart({ data }: GpuBurnChartProps) {
  return (
    <div className="w-full space-y-4">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" label={{ value: '时间 (秒)', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: '数值', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="power"
            stroke="#8884d8"
            name="功耗 (W)"
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="temp"
            stroke="#82ca9d"
            name="温度 (°C)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
