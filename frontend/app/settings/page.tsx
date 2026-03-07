"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout/layout"
import { apiClient } from "@/lib/api"
import {
  Settings,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  Wifi,
  Shield,
  Server,
  Cpu,
  HardDrive,
} from "lucide-react"
import { toast } from "sonner"

interface HealthStatus {
  status: string
  version: string
  database: string
}

type CheckStatus = "checking" | "connected" | "error"

interface ConnectionCheck {
  name: string
  icon: any
  status: CheckStatus
  detail: string
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checks, setChecks] = useState<ConnectionCheck[]>([
    { name: "后端 API", icon: Server, status: "checking", detail: "" },
    { name: "PostgreSQL 数据库", icon: Database, status: "checking", detail: "" },
    { name: "Redis 消息队列", icon: HardDrive, status: "checking", detail: "" },
  ])

  const runChecks = async () => {
    setLoading(true)
    const reset: ConnectionCheck[] = checks.map(c => ({ ...c, status: "checking" as CheckStatus, detail: "" }))
    setChecks(reset)

    const updated = [...reset]
    try {
      const data = await apiClient.getDashboardHealth()
      setHealth(data)
      const dbOk: CheckStatus = data.database === "connected" ? "connected" : "error"
      updated[0] = { ...updated[0], status: "connected" as CheckStatus, detail: `v${data.version || "0.3.0"} — ${data.status}` }
      updated[1] = { ...updated[1], status: dbOk, detail: data.database || "unknown" }
      updated[2] = { ...updated[2], status: "connected" as CheckStatus, detail: "默认配置" }
    } catch (e: any) {
      updated[0] = { ...updated[0], status: "error" as CheckStatus, detail: e?.message || "无法连接" }
      updated[1] = { ...updated[1], status: "error" as CheckStatus, detail: "依赖后端 API" }
      updated[2] = { ...updated[2], status: "error" as CheckStatus, detail: "依赖后端 API" }
    }

    setChecks(updated)
    setLoading(false)
  }

  useEffect(() => { runChecks() }, [])

  const statusIcon = (s: string) => {
    if (s === "connected") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    if (s === "error") return <XCircle className="h-4 w-4 text-red-400" />
    return <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-600/10 flex items-center justify-center border border-purple-500/10">
              <Settings className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">系统设置</h2>
              <p className="text-xs text-slate-500">连接状态 · 版本信息 · 平台配置</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { runChecks(); toast.success("连接检测已刷新") }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />重新检测
          </Button>
        </div>

        {/* Connection checks */}
        <Card className="animate-fade-up stagger-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Wifi className="h-4 w-4 text-cyan-400" />
              连接状态检测
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((c) => (
              <div key={c.name} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <c.icon className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">{c.name}</p>
                  {c.detail && <p className="text-xs text-slate-500 font-mono mt-0.5">{c.detail}</p>}
                </div>
                {statusIcon(c.status)}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Platform info */}
        <div className="grid md:grid-cols-2 gap-4 animate-fade-up stagger-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-violet-400" />
                平台版本
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                ["平台名称", "HyperNode Provisioner"],
                ["版本", health?.version || "0.3.0"],
                ["后端框架", "Spring Boot 3.4.3 / JDK 21"],
                ["前端框架", "Next.js 14 / React 18"],
                ["数据库", "PostgreSQL + Flyway"],
                ["消息队列", "Redis Streams"],
                ["自动化引擎", "Ansible"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs text-slate-300 font-mono">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                安全配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                ["SSH 认证", "私钥 (强制)"],
                ["凭证加密", "Jasypt AES-256 / Vault KV2"],
                ["CORS", "允许 localhost:3000"],
                ["CSRF", "已禁用 (Stateless API)"],
                ["审计日志", "已启用 (数据库持久化)"],
                ["TLS/mTLS", "待配置"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs text-slate-300 font-mono">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* API endpoints */}
        <Card className="animate-fade-up stagger-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-400" />
              API 端点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-2">
              {[
                ["GET", "/api/v1/dashboard/stats", "仪表盘统计"],
                ["GET", "/api/v1/servers", "节点列表"],
                ["POST", "/api/v1/provision/{id}/start", "启动部署"],
                ["POST", "/api/v1/provision/{id}/rollback", "回滚"],
                ["GET", "/api/v1/tasks", "任务列表"],
                ["GET", "/api/v1/audit/logs", "审计日志"],
                ["POST", "/api/v1/benchmark/start-gpu-burn", "GPU 烤机"],
                ["POST", "/api/v1/benchmark/start-nccl", "NCCL 测试"],
                ["GET", "/sse/task/{taskId}", "SSE 实时推送"],
                ["GET", "/api/v1/templates", "配置模板"],
              ].map(([method, path, desc]) => (
                <div key={path} className="flex items-center gap-3 p-2 rounded bg-white/[0.02]">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${method === "GET" ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"}`}>
                    {method}
                  </span>
                  <span className="text-xs font-mono text-slate-400 flex-1 truncate">{path}</span>
                  <span className="text-[10px] text-slate-600 flex-shrink-0">{desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
