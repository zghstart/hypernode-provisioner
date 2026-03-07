"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout/layout"
import { apiClient } from "@/lib/api"
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Zap,
  RotateCcw,
  KeyRound,
  Rocket,
  Clock,
  ScrollText,
} from "lucide-react"

interface AuditEntry {
  id: string
  action: string
  targetId: string
  userId: string
  ipAddress: string
  details: string
  createdAt: string
}

const actionConfig: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  FORCE_RUN: { label: "强制执行", icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  ROLLBACK: { label: "回滚操作", icon: RotateCcw, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  CREDENTIAL_ACCESS: { label: "凭证访问", icon: KeyRound, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  PROVISION_START: { label: "启动部署", icon: Rocket, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
}

const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState("")
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const pageSize = 15

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params: any = { page, size: pageSize }
      if (actionFilter) params.action = actionFilter
      const res = await apiClient.getAuditLogs(params)
      setLogs(res.logs || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 0)
    } catch { setLogs([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [page, actionFilter])

  const formatTime = (ts: string) => {
    if (!ts) return "—"
    try {
      const d = new Date(ts)
      return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    } catch { return ts }
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 flex items-center justify-center border border-violet-500/10">
              <ShieldCheck className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">审计日志</h2>
              <p className="text-xs text-slate-500">敏感操作追踪 · 强制执行 · 回滚 · 凭证访问</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
              <select className={`${inputCls} pl-9 w-[180px]`} value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0) }}>
                <option value="">全部操作</option>
                {Object.entries(actionConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />刷新
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500 animate-fade-up stagger-1">
          <span>共 <span className="text-white font-mono">{total}</span> 条记录</span>
          <span>第 <span className="text-white font-mono">{page + 1}</span> / {totalPages || 1} 页</span>
        </div>

        {/* Log list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ScrollText className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">暂无审计记录</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 animate-fade-up stagger-2">
            {logs.map((log, idx) => {
              const cfg = actionConfig[log.action] ?? { label: log.action, icon: ShieldCheck, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" }
              const Icon = cfg.icon
              return (
                <Card key={log.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs font-mono text-slate-400">目标: {log.targetId?.slice(0, 12)}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                          <span>操作人: <span className="text-slate-300">{log.userId}</span></span>
                          <span>IP: <span className="font-mono text-slate-300">{log.ipAddress}</span></span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 animate-fade-up">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-slate-400 px-3">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  )
}
