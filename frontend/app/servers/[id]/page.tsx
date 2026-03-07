"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout/layout"
import { apiClient } from "@/lib/api"
import {
  Server, ArrowLeft, Cpu, HardDrive, MemoryStick, Monitor,
  Wifi, WifiOff, RefreshCw, Loader2, Shield, CheckCircle2,
  XCircle, Clock, Activity, Rocket, Undo2,
} from "lucide-react"
import { toast } from "sonner"

interface SpecData {
  cpu?: string
  memory?: string
  disk?: string
  kernel?: string
  os?: string
  gpu?: string
  cuda?: string
  docker?: string
  collectedAt?: number
  error?: string
}

const connectColors: Record<string, string> = {
  ONLINE: "text-emerald-400",
  OFFLINE: "text-red-400",
  UNKNOWN: "text-slate-500",
}

export default function ServerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [server, setServer] = useState<any>(null)
  const [specs, setSpecs] = useState<SpecData | null>(null)
  const [loading, setLoading] = useState(true)
  const [specsLoading, setSpecsLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])

  const fetchServer = useCallback(async () => {
    try {
      const data = await apiClient.getServer(id)
      setServer(data)
    } catch { toast.error("无法加载节点信息") }
    finally { setLoading(false) }
  }, [id])

  const fetchTasks = useCallback(async () => {
    try {
      const data = await apiClient.getTasksByServer(id)
      setTasks(Array.isArray(data) ? data.slice(0, 10) : [])
    } catch {}
  }, [id])

  const fetchSpecs = async () => {
    setSpecsLoading(true)
    try {
      const data = await apiClient.getServerSpecs(id)
      setSpecs(data)
      toast.success("系统规格采集完成")
    } catch { toast.error("规格采集失败") }
    finally { setSpecsLoading(false) }
  }

  const testConn = async () => {
    setTesting(true)
    try {
      const r = await apiClient.testServerConnection(id)
      if (r.reachable) toast.success("连接正常")
      else toast.error(`连接失败 — ${r.error || ""}`)
      await fetchServer()
    } catch { toast.error("测试请求失败") }
    finally { setTesting(false) }
  }

  useEffect(() => { fetchServer(); fetchTasks() }, [fetchServer, fetchTasks])

  useEffect(() => {
    if (server?.systemSpecs) {
      try { setSpecs(JSON.parse(server.systemSpecs)) } catch {}
    }
  }, [server])

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
        <span className="ml-3 text-sm text-slate-500">加载中...</span>
      </div>
    </Layout>
  )

  if (!server) return (
    <Layout>
      <div className="text-center py-32">
        <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-slate-400">节点不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/servers")}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />返回列表
        </Button>
      </div>
    </Layout>
  )

  const gpu = (() => {
    try { const j = JSON.parse(server.gpuTopology || "{}"); return j } catch { return {} }
  })()

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.push("/servers")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 flex items-center justify-center border border-cyan-500/10">
              <Server className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mono">{server.ipAddress}</h2>
              <p className="text-xs text-slate-500">{server.username}@:{server.sshPort ?? 22} · {server.id?.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={testConn} disabled={testing}>
              {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5 mr-1.5" />}测试连接
            </Button>
            <Button variant="outline" size="sm" onClick={fetchSpecs} disabled={specsLoading}>
              {specsLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}采集规格
            </Button>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up stagger-1">
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">连接状态</p>
              <div className="flex items-center gap-2">
                {server.connectStatus === "ONLINE" ? <Wifi className="h-4 w-4 text-emerald-400" /> : <WifiOff className="h-4 w-4 text-red-400" />}
                <span className={`text-lg font-bold ${connectColors[server.connectStatus] || "text-slate-500"}`}>
                  {server.connectStatus === "ONLINE" ? "在线" : server.connectStatus === "OFFLINE" ? "离线" : "未检测"}
                </span>
              </div>
              {server.lastCheckAt && <p className="text-[10px] text-slate-600 mt-1">{server.lastCheckAt}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">部署状态</p>
              <p className="text-lg font-bold text-white">{server.status}</p>
              {server.lastDeploymentVersion && <p className="text-[10px] text-slate-600 mt-1">v{server.lastDeploymentVersion}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">GPU 配置</p>
              <div className="flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-violet-400" />
                <span className="text-lg font-bold text-white">{gpu.gpu_count ?? 0} × {gpu.gpu_model ?? "—"}</span>
              </div>
              {gpu.nvlink && <p className="text-[10px] text-violet-400 mt-1">NVLink Enabled</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">认证方式</p>
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-lg font-bold text-emerald-400">SSH Key</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System specs */}
        <Card className="animate-fade-up stagger-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-cyan-400" />
              系统配置详情
              {!specs && <span className="text-[10px] text-slate-600 font-normal ml-2">点击「采集规格」获取远程主机信息</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {specs ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "CPU", icon: Cpu, data: specs.cpu, color: "text-blue-400" },
                  { title: "内存", icon: MemoryStick, data: specs.memory, color: "text-emerald-400" },
                  { title: "磁盘", icon: HardDrive, data: specs.disk, color: "text-amber-400" },
                  { title: "GPU / CUDA", icon: Cpu, data: `${specs.gpu || "—"}\n${specs.cuda || ""}`, color: "text-violet-400" },
                  { title: "操作系统", icon: Monitor, data: `${specs.os || "—"}\nKernel: ${specs.kernel || "—"}`, color: "text-cyan-400" },
                  { title: "Docker", icon: Activity, data: specs.docker || "—", color: "text-pink-400" },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-xs font-medium text-slate-300">{item.title}</span>
                    </div>
                    <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                      {item.data || "—"}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Monitor className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">尚未采集系统规格</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchSpecs} disabled={specsLoading}>
                  {specsLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  立即采集
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent tasks */}
        <Card className="animate-fade-up stagger-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              最近任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      {t.status === "COMPLETED" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
                       t.status === "FAILED" ? <XCircle className="h-3.5 w-3.5 text-red-400" /> :
                       t.status === "RUNNING" ? <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" /> :
                       <Clock className="h-3.5 w-3.5 text-slate-500" />}
                      <span className="text-xs font-mono text-slate-300">{t.id?.slice(0, 8)}</span>
                      <span className="text-xs text-slate-500">{t.status}</span>
                    </div>
                    <span className="text-[10px] text-slate-600">{t.createdAt || "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 text-center py-6">暂无任务记录</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
