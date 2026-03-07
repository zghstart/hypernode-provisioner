"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Layout } from "@/components/layout/layout"
import { apiClient } from "@/lib/api"
import {
  Server,
  Play,
  Activity,
  FileCode,
  Cpu,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Settings,
} from "lucide-react"

interface StatData {
  totalServers: number
  provisioned: number
  deploying: number
  failed: number
  totalTasks: number
  runningTasks: number
  totalGpus: number
  totalDataCenters: number
}

function parseGpuCount(raw?: string): number {
  if (!raw) return 0
  try {
    const json = JSON.parse(raw)
    return typeof json.gpu_count === "number" ? json.gpu_count : 0
  } catch { return 0 }
}

export default function HomePage() {
  const [stats, setStats] = useState<StatData>({
    totalServers: 0, provisioned: 0, deploying: 0, failed: 0,
    totalTasks: 0, runningTasks: 0, totalGpus: 0, totalDataCenters: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getDashboardStats()
        const sv = data?.servers || {}
        const tk = data?.tasks || {}

        setStats({
          totalServers: sv.total ?? 0,
          provisioned: sv.provisioned ?? 0,
          deploying: sv.provisioning ?? 0,
          failed: sv.failed ?? 0,
          totalTasks: tk.total ?? 0,
          runningTasks: tk.running ?? 0,
          totalGpus: sv.totalGpus ?? 0,
          totalDataCenters: 0,
        })
      } catch (e) {
        console.error("Dashboard stats API unavailable, trying fallback", e)
        try {
          const [serversRaw, tasksRaw, dcRaw] = await Promise.all([
            apiClient.getServers(), apiClient.getTasks(), apiClient.getDataCenters(),
          ])
          const servers = Array.isArray(serversRaw) ? serversRaw : []
          const tasks = Array.isArray(tasksRaw) ? tasksRaw : []
          const dcs = Array.isArray(dcRaw) ? dcRaw : []
          setStats({
            totalServers: servers.length,
            provisioned: servers.filter((s: any) => s.status === "PROVISIONED").length,
            deploying: servers.filter((s: any) => s.status === "PROVISIONING").length,
            failed: servers.filter((s: any) => s.status === "FAILED").length,
            totalTasks: tasks.length,
            runningTasks: tasks.filter((t: any) => t.status === "RUNNING").length,
            totalGpus: servers.reduce((sum: number, s: any) => sum + parseGpuCount(s.gpuTopology), 0),
            totalDataCenters: dcs.length,
          })
        } catch { /* API unavailable */ }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const metricCards = [
    {
      label: "GPU 节点",
      value: stats.totalServers,
      icon: Server,
      color: "text-cyan-400",
      glow: "shadow-cyan-500/10",
      bg: "from-cyan-500/10 to-cyan-600/5",
    },
    {
      label: "已就绪",
      value: stats.provisioned,
      icon: CheckCircle2,
      color: "text-emerald-400",
      glow: "shadow-emerald-500/10",
      bg: "from-emerald-500/10 to-emerald-600/5",
    },
    {
      label: "部署中",
      value: stats.deploying,
      icon: Loader2,
      color: "text-blue-400",
      glow: "shadow-blue-500/10",
      bg: "from-blue-500/10 to-blue-600/5",
      animate: stats.deploying > 0,
    },
    {
      label: "异常节点",
      value: stats.failed,
      icon: AlertTriangle,
      color: "text-red-400",
      glow: "shadow-red-500/10",
      bg: "from-red-500/10 to-red-600/5",
    },
  ]

  const quickNav = [
    {
      title: "节点管理",
      desc: "管理裸金属 GPU 服务器的 SSH 凭证、拓扑与部署",
      href: "/servers",
      icon: Server,
      accent: "group-hover:text-cyan-400",
    },
    {
      title: "部署任务",
      desc: "实时监控 Ansible 自动化部署进度，支持回滚",
      href: "/tasks",
      icon: Play,
      accent: "group-hover:text-emerald-400",
    },
    {
      title: "数据中心",
      desc: "配置代理、镜像源，管理多区域基础设施",
      href: "/datacenters",
      icon: Activity,
      accent: "group-hover:text-blue-400",
    },
    {
      title: "配置模板",
      desc: "多版本 Driver / CUDA 部署场景模板",
      href: "/templates",
      icon: FileCode,
      accent: "group-hover:text-amber-400",
    },
    {
      title: "系统设置",
      desc: "Redis / Vault / 监控等系统级参数配置",
      href: "/settings",
      icon: Settings,
      accent: "group-hover:text-purple-400",
    },
  ]

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Hero */}
        <div className="animate-fade-up space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-900/30">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                GPU 算力平台
              </h1>
              <p className="text-sm text-slate-500">
                裸金属服务器自动化配置与性能验证
              </p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up stagger-1">
          {metricCards.map((m) => (
            <Card key={m.label} className={`relative overflow-hidden ${m.glow}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${m.bg} pointer-events-none`} />
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <m.icon className={`h-5 w-5 ${m.color} ${m.animate ? "animate-spin" : ""}`} />
                  <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                    {m.label}
                  </span>
                </div>
                <div className={`text-3xl font-bold tabular-nums ${loading ? "animate-pulse text-slate-600" : "text-white"}`}>
                  {loading ? "—" : m.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary stats row */}
        <div className="grid grid-cols-3 gap-4 animate-fade-up stagger-2">
          <Card className="border-dashed">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-600/5 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">GPU 总卡数</p>
                <p className="text-xl font-bold text-white font-mono">{loading ? "—" : stats.totalGpus}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-600/5 flex items-center justify-center">
                <Play className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">运行中任务</p>
                <p className="text-xl font-bold text-white font-mono">{loading ? "—" : stats.runningTasks}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-600/5 flex items-center justify-center">
                <Activity className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">数据中心</p>
                <p className="text-xl font-bold text-white font-mono">{loading ? "—" : stats.totalDataCenters}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick navigation */}
        <div className="space-y-4 animate-fade-up stagger-3">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">快速导航</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {quickNav.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="group cursor-pointer h-full hover:border-white/[0.12] transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-white/[0.06]">
                        <item.icon className={`h-5 w-5 text-slate-500 transition-colors ${item.accent}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                            {item.title}
                          </h4>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-all group-hover:translate-x-0.5" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 group-hover:text-slate-400 transition-colors">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
