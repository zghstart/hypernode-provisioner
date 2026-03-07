"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProvisionCard } from "@/components/chart/provision-card"
import { Layout } from "@/components/layout/layout"
import { apiClient } from "@/lib/api"
import {
  Play,
  RefreshCw,
  Loader2,
  Rocket,
  RotateCcw,
  Zap,
  ArrowRight,
  Radio,
  ListChecks,
} from "lucide-react"
import { toast } from "sonner"

const PROVISION_STEPS = [
  "禁用 Nouveau",
  "配置 APT 源",
  "安装 NVIDIA 驱动",
  "安装 CUDA Toolkit",
  "配置环境变量",
  "开启持久化模式",
  "网络性能调优",
]

type ProvisionStatus = "pending" | "running" | "completed" | "failed" | "rollback"

function mapStatus(s: string): ProvisionStatus {
  const u = (s || "").toUpperCase()
  if (u === "RUNNING" || u === "ROLLING_BACK") return u === "ROLLING_BACK" ? "rollback" : "running"
  if (u === "COMPLETED") return "completed"
  if (u === "FAILED" || u === "ROLLED_BACK") return "failed"
  return "pending"
}

interface TaskRow {
  id: string
  serverId: string
  status: string
  currentStep: number
  totalSteps: number
  rollbackRequired?: boolean
  forceRun?: boolean
  retryCount?: number
  startedAt?: string
  completedAt?: string
  createdAt?: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [servers, setServers] = useState<Array<{ id: string; ipAddress: string; gpuTopology?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [sseTaskId, setSseTaskId] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, { currentStep: number; totalSteps: number }>>({})
  const [forceRunConfirm, setForceRunConfirm] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const data = await apiClient.getTasks()
      setTasks(Array.isArray(data) ? data : [])
    } catch { setTasks([]) }
  }, [])

  const fetchServers = useCallback(async () => {
    try {
      const data = await apiClient.getServers()
      setServers(Array.isArray(data) ? data : [])
    } catch { setServers([]) }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTasks(), fetchServers()]).finally(() => setLoading(false))
  }, [fetchTasks, fetchServers])

  useEffect(() => {
    if (!sseTaskId) return
    const base = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${base.replace(/:\d+$/, ":8080")}/api/v1/stream/events?taskId=${sseTaskId}`
    const es = new EventSource(url)
    es.onmessage = (event) => {
      try {
        const d = JSON.parse(event.data)
        if (d.taskId && (d.currentStep != null || d.totalSteps != null)) {
          setProgress((prev) => ({
            ...prev,
            [d.taskId]: {
              currentStep: d.currentStep ?? prev[d.taskId]?.currentStep ?? 0,
              totalSteps: d.totalSteps ?? prev[d.taskId]?.totalSteps ?? 7,
            },
          }))
        }
      } catch {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [sseTaskId])

  const startProvision = async (serverId: string) => {
    try {
      const res = await apiClient.startProvision(serverId) as { taskId?: string }
      if (res?.taskId) setSseTaskId(res.taskId)
      fetchTasks()
      toast.success("部署任务已启动")
    } catch {}
  }

  const executeTask = async (taskId: string, serverId: string) => {
    try { await apiClient.executeTask(taskId, serverId); setSseTaskId(taskId); fetchTasks() } catch {}
  }

  const rollbackTask = async (taskId: string, serverId: string) => {
    try { await apiClient.rollbackTask(taskId, serverId); fetchTasks(); toast.success("回滚任务已启动") } catch {}
  }

  const forceRunTask = async (taskId: string) => {
    try { await apiClient.setTaskForceRun(taskId, true); setForceRunConfirm(null); fetchTasks(); toast.success("强制执行已触发") } catch {}
  }

  const serverMap = Object.fromEntries(servers.map((s) => [s.id, s]))

  const taskStats = {
    total: tasks.length,
    running: tasks.filter((t) => t.status === "RUNNING").length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    failed: tasks.filter((t) => t.status === "FAILED").length,
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 flex items-center justify-center border border-emerald-500/10">
              <Play className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">部署任务</h2>
              <p className="text-xs text-slate-500">Ansible 自动化 · 实时 SSE 进度 · 支持回滚</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sseTaskId && (
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-400/5 rounded-full px-3 py-1.5 border border-cyan-400/10">
                <Radio className="h-3 w-3 animate-pulse" />
                SSE 实时连接中
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => { fetchTasks(); fetchServers() }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />刷新
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 animate-fade-up stagger-1">
          {[
            { label: "总任务", val: taskStats.total, color: "text-slate-300" },
            { label: "运行中", val: taskStats.running, color: "text-cyan-400" },
            { label: "已完成", val: taskStats.completed, color: "text-emerald-400" },
            { label: "失败", val: taskStats.failed, color: "text-red-400" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span>
                <span className={`text-xl font-bold font-mono ${s.color}`}>{loading ? "—" : s.val}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
            <span className="ml-3 text-sm text-slate-500">加载中...</span>
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ListChecks className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">暂无部署任务</p>
              <p className="text-xs text-slate-600 mt-1">在「节点管理」中选择服务器触发部署</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 animate-fade-up stagger-2">
            {tasks.map((task) => {
              const server = serverMap[task.serverId]
              const ip = server?.ipAddress ?? task.serverId
              const prog = progress[task.id] ?? { currentStep: task.currentStep, totalSteps: task.totalSteps || 7 }
              const total = prog.totalSteps || 7
              const pct = total > 0 ? Math.round((prog.currentStep / total) * 100) : 0
              const steps = PROVISION_STEPS.map((name, i) => ({
                name,
                completed: task.status === "COMPLETED" ? true : prog.currentStep > i,
                failed: task.status === "FAILED" && prog.currentStep === i + 1,
              }))

              return (
                <Card key={task.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-white">{ip}</span>
                        <span className="text-[10px] text-slate-600 font-mono">{task.id.slice(0, 8)}</span>
                      </div>
                      {task.status === "RUNNING" && (
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ProvisionCard
                      title={ip}
                      status={mapStatus(task.status)}
                      progress={pct}
                      description={server?.gpuTopology ? String(server.gpuTopology).slice(0, 40) : "GPU 节点"}
                      steps={steps}
                    />

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.04]">
                      {(task.status === "PENDING" || task.status === "FAILED") && (
                        <Button size="sm" onClick={() => startProvision(task.serverId)}>
                          <Rocket className="h-3.5 w-3.5 mr-1" />开始部署
                        </Button>
                      )}
                      {task.status === "RUNNING" && (
                        <Button size="sm" variant="outline" onClick={() => executeTask(task.id, task.serverId)}>
                          <ArrowRight className="h-3.5 w-3.5 mr-1" />继续执行
                        </Button>
                      )}
                      {(task.status === "COMPLETED" || task.status === "RUNNING") && (
                        <Button size="sm" variant="outline" onClick={() => rollbackTask(task.id, task.serverId)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />回滚
                        </Button>
                      )}
                      {(task.status === "FAILED" || task.status === "ROLLED_BACK") && (
                        forceRunConfirm === task.id ? (
                          <Button size="sm" variant="destructive" onClick={() => forceRunTask(task.id)}>
                            确认强制执行
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="text-amber-400 border-amber-400/20 hover:bg-amber-400/5" onClick={() => setForceRunConfirm(task.id)}>
                            <Zap className="h-3.5 w-3.5 mr-1" />强制执行
                          </Button>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
