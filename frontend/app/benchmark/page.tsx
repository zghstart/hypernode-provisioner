"use client"

import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout/layout"
import { apiClient } from "@/lib/api"
import dynamic from "next/dynamic"

const RechartsLineChart = dynamic(() => import("recharts").then(m => ({ default: m.LineChart })), { ssr: false })
const RechartsBarChart = dynamic(() => import("recharts").then(m => ({ default: m.BarChart })), { ssr: false })

import {
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import {
  Gauge,
  Play,
  RefreshCw,
  Loader2,
  Cpu,
  Zap,
  Thermometer,
  Network,
  ArrowDownUp,
  Server,
} from "lucide-react"

interface ServerOption { id: string; ipAddress: string; gpuTopology?: string }

const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"

export default function BenchmarkPage() {
  const [servers, setServers] = useState<ServerOption[]>([])
  const [selectedServer, setSelectedServer] = useState("")
  const [loading, setLoading] = useState(true)

  const [gpuBurnRunning, setGpuBurnRunning] = useState(false)
  const [gpuBurnData, setGpuBurnData] = useState<any[]>([])
  const [gpuBurnStats, setGpuBurnStats] = useState<any>(null)

  const [ncclRunning, setNcclRunning] = useState(false)
  const [ncclData, setNcclData] = useState<any[]>([])

  const [report, setReport] = useState<any>(null)
  const [duration, setDuration] = useState(300)

  const fetchServers = useCallback(async () => {
    try {
      const data = await apiClient.getServers()
      setServers(Array.isArray(data) ? data : [])
      if (data.length > 0 && !selectedServer) setSelectedServer(data[0].id)
    } catch { setServers([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchServers() }, [fetchServers])

  const startGpuBurn = async () => {
    if (!selectedServer) return
    setGpuBurnRunning(true)
    try {
      await apiClient.startGpuBurn(selectedServer, duration)
      setTimeout(() => loadGpuBurnResults(), 3000)
    } catch {} finally { setGpuBurnRunning(false) }
  }

  const loadGpuBurnResults = async () => {
    if (!selectedServer) return
    try {
      const res = await apiClient.getGpuBurnResults(selectedServer)
      setGpuBurnData(res.metrics || [])
      setGpuBurnStats(res.stats || null)
    } catch {}
  }

  const startNccl = async () => {
    if (!selectedServer) return
    setNcclRunning(true)
    try {
      await apiClient.startNcclTest(selectedServer, "all_reduce")
      setTimeout(() => loadNcclResults(), 3000)
    } catch {} finally { setNcclRunning(false) }
  }

  const loadNcclResults = async () => {
    if (!selectedServer) return
    try {
      const res = await apiClient.getNcclResults(selectedServer)
      setNcclData(res.metrics || [])
    } catch {}
  }

  const loadReport = async () => {
    if (!selectedServer) return
    try {
      const res = await apiClient.getPerformanceReport(selectedServer)
      setReport(res)
    } catch {}
  }

  const loadAll = () => {
    loadGpuBurnResults()
    loadNcclResults()
    loadReport()
  }

  useEffect(() => {
    if (selectedServer) loadAll()
  }, [selectedServer])

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-600/10 flex items-center justify-center border border-orange-500/10">
              <Gauge className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">压测监控</h2>
              <p className="text-xs text-slate-500">GPU Burn · NCCL Tests · DCGM 性能数据</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select className={`${inputCls} w-[220px]`} value={selectedServer} onChange={(e) => setSelectedServer(e.target.value)}>
              <option value="">选择节点</option>
              {servers.map((s) => <option key={s.id} value={s.id}>{s.ipAddress}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={!selectedServer}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />刷新数据
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
          </div>
        ) : !selectedServer ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Server className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">请先选择一台 GPU 节点</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Action buttons */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up stagger-1">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-slate-400">GPU 烤机</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" className={`${inputCls} w-20 text-center`} value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={60} step={60} />
                    <span className="text-xs text-slate-500">秒</span>
                  </div>
                  <Button size="sm" className="w-full" onClick={startGpuBurn} disabled={gpuBurnRunning}>
                    {gpuBurnRunning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                    启动 GPU Burn
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-slate-400">NCCL 测试</span>
                  </div>
                  <p className="text-xs text-slate-600">all_reduce_perf 吞吐测试</p>
                  <Button size="sm" className="w-full" onClick={startNccl} disabled={ncclRunning}>
                    {ncclRunning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                    启动 NCCL Test
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span className="text-xs text-slate-400">NVLink 带宽</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">
                    {report?.nvlink?.bandwidth ?? "—"}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">p2pBandwidthLatencyTest</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownUp className="h-4 w-4 text-violet-400" />
                    <span className="text-xs text-slate-400">RDMA 吞吐</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">
                    {report?.nccl?.allReduceAvg ?? "—"}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">all_reduce average</p>
                </CardContent>
              </Card>
            </div>

            {/* GPU Burn Chart */}
            <Card className="animate-fade-up stagger-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-red-400" />
                  GPU 烤机 — 功耗 & 温度
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gpuBurnData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-slate-600">
                    暂无数据，点击「启动 GPU Burn」开始测试
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsLineChart data={gpuBurnData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                      <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="power" name="功耗 (W)" stroke="#f97316" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="temp" name="温度 (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* NCCL Chart */}
            <Card className="animate-fade-up stagger-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Network className="h-4 w-4 text-blue-400" />
                  NCCL 性能 — all_reduce 吞吐量
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ncclData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-slate-600">
                    暂无数据，点击「启动 NCCL Test」开始测试
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsBarChart data={ncclData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                      <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                      <Bar dataKey="all_reduce" name="all_reduce (GB/s)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="broadcast" name="broadcast (GB/s)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Performance summary */}
            {report && (
              <Card className="animate-fade-up stagger-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-violet-400" />
                    综合性能报告
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">GPU Burn</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">状态</span><span className="text-emerald-400">{report.gpuBurn?.status ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">平均功耗</span><span className="text-white font-mono">{report.gpuBurn?.averagePower ?? "—"} W</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">平均温度</span><span className="text-white font-mono">{report.gpuBurn?.averageTemp ?? "—"} °C</span></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">NCCL</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">状态</span><span className="text-emerald-400">{report.nccl?.status ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">AllReduce</span><span className="text-white font-mono">{report.nccl?.allReduceAvg ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Broadcast</span><span className="text-white font-mono">{report.nccl?.broadcastAvg ?? "—"}</span></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">NVLink</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">状态</span><span className="text-emerald-400">{report.nvlink?.status ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">带宽</span><span className="text-white font-mono">{report.nvlink?.bandwidth ?? "—"}</span></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
