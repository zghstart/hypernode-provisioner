"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Layout } from "@/components/layout/layout"
import { Progress } from "@/components/ui/progress"
import { apiClient } from "@/lib/api"
import Link from "next/link"
import {
  Server,
  Plus,
  Search,
  Filter,
  RotateCcw,
  KeyRound,
  Eye,
  Pencil,
  Trash2,
  Rocket,
  Undo2,
  ExternalLink,
  Cpu,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  Upload,
  FileKey,
} from "lucide-react"
import { toast } from "sonner"

interface DataCenterRow { id: string; name: string }
interface TemplateOption { id: string; name: string; version?: string; description?: string }
interface KeyProfileOption { id: string; name: string; username: string; fingerprint?: string }

interface ServerRow {
  id: string
  ipAddress: string
  sshPort?: number
  username: string
  dataCenter?: DataCenterRow | { id: string; name: string }
  gpuTopology?: string
  status: string
  sshKeyProfileId?: string
  connectStatus?: string
  lastCheckAt?: string
  systemSpecs?: string
  lastDeploymentVersion?: string
  createdAt?: string
  updatedAt?: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  PROVISIONING: { label: "部署中", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", dot: "bg-blue-400" },
  PROVISIONED: { label: "已就绪", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", dot: "bg-emerald-400" },
  FAILED: { label: "失败", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", dot: "bg-red-400" },
  DEPROVISIONING: { label: "下线中", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", dot: "bg-amber-400" },
  DEPROVISIONED: { label: "已下线", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20", dot: "bg-slate-500" },
  PENDING: { label: "待部署", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-500/20", dot: "bg-slate-500" },
}

const connectConfig: Record<string, { label: string; color: string; dot: string }> = {
  ONLINE: { label: "在线", color: "text-emerald-400", dot: "bg-emerald-400" },
  OFFLINE: { label: "离线", color: "text-red-400", dot: "bg-red-400" },
  UNKNOWN: { label: "未检测", color: "text-slate-500", dot: "bg-slate-500" },
}

const defaultForm = {
  ipAddress: "",
  sshPort: 22,
  username: "",
  privateKey: "",
  dataCenterId: "",
  gpuTopology: '{"gpu_count":8,"gpu_model":"H100","nvlink":true}',
  status: "PENDING",
}

function looksLikePrivateKey(value: string): boolean {
  const v = value.trim()
  return v.includes("-----BEGIN") && v.includes("PRIVATE KEY-----")
}

function parseGpu(raw?: string) {
  if (!raw) return { text: "—", count: 0, model: "—", nvlink: false }
  try {
    const j = JSON.parse(raw)
    return {
      text: `${j.gpu_count ?? "?"} × ${j.gpu_model ?? "Unknown"}`,
      count: j.gpu_count ?? 0,
      model: String(j.gpu_model ?? "Unknown"),
      nvlink: !!j.nvlink,
    }
  } catch { return { text: raw, count: 0, model: "—", nvlink: false } }
}

const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"

export default function ServersPage() {
  const [servers, setServers] = useState<ServerRow[]>([])
  const [datacenters, setDatacenters] = useState<DataCenterRow[]>([])
  const [loading, setLoading] = useState(true)

  const [dcFilter, setDcFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [keyword, setKeyword] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const [selectedServer, setSelectedServer] = useState<ServerRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [keyRotateServer, setKeyRotateServer] = useState<ServerRow | null>(null)
  const [newPrivateKey, setNewPrivateKey] = useState("")
  const [keySubmitting, setKeySubmitting] = useState(false)
  const [keyError, setKeyError] = useState("")

  const [deployDialogOpen, setDeployDialogOpen] = useState(false)
  const [deployServerId, setDeployServerId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [deployTemplateId, setDeployTemplateId] = useState("")
  const [deploying, setDeploying] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeploying, setBatchDeploying] = useState(false)
  const [batchRolling, setBatchRolling] = useState(false)

  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const [preTestResult, setPreTestResult] = useState<{ reachable?: boolean; error?: string } | null>(null)
  const [preTestLoading, setPreTestLoading] = useState(false)

  const [keyProfiles, setKeyProfiles] = useState<KeyProfileOption[]>([])
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchKeyProfileId, setBatchKeyProfileId] = useState("")
  const [batchDcId, setBatchDcId] = useState("")
  const [batchGpuTopology, setBatchGpuTopology] = useState('{"gpu_count":8,"gpu_model":"H100","nvlink":true}')
  const [batchNodesText, setBatchNodesText] = useState("")
  const [batchSubmitting, setBatchSubmitting] = useState(false)
  const [selectedKeyProfileId, setSelectedKeyProfileId] = useState("")

  const fetchDc = async () => {
    try {
      const data = await apiClient.getDataCenters()
      setDatacenters(Array.isArray(data) ? data : [])
    } catch { setDatacenters([]) }
  }
  const fetchServers = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getServers(dcFilter || undefined)
      setServers(Array.isArray(data) ? data : [])
    } catch { setServers([]) }
    finally { setLoading(false) }
  }

  const fetchTemplates = async () => {
    try {
      const data = await apiClient.getTemplates()
      setTemplates(Array.isArray(data) ? data : [])
    } catch { setTemplates([]) }
  }
  const fetchKeyProfiles = async () => {
    try {
      const data = await apiClient.getSshKeyProfiles()
      setKeyProfiles(Array.isArray(data) ? data : [])
    } catch { setKeyProfiles([]) }
  }

  useEffect(() => { fetchDc(); fetchTemplates(); fetchKeyProfiles() }, [])
  useEffect(() => { fetchServers() }, [dcFilter])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return servers.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false
      if (!q) return true
      const dc = ((s.dataCenter as { name?: string })?.name ?? "").toLowerCase()
      return s.ipAddress.toLowerCase().includes(q) || s.username.toLowerCase().includes(q) || dc.includes(q)
    })
  }, [servers, statusFilter, keyword])

  const stats = useMemo(() => {
    const t = filtered.length
    const ok = filtered.filter((s) => s.status === "PROVISIONED").length
    const run = filtered.filter((s) => s.status === "PROVISIONING").length
    const fail = filtered.filter((s) => s.status === "FAILED").length
    const gpus = filtered.reduce((sum, s) => sum + parseGpu(s.gpuTopology).count, 0)
    return { total: t, ok, run, fail, gpus }
  }, [filtered])

  const openCreate = () => {
    setEditingId(null); setForm({ ...defaultForm, dataCenterId: dcFilter || "" })
    setFormError(""); setPreTestResult(null); setSelectedKeyProfileId(""); setDialogOpen(true)
  }
  const openEdit = (row: ServerRow) => {
    setEditingId(row.id)
    setForm({
      ipAddress: row.ipAddress, sshPort: row.sshPort ?? 22, username: row.username,
      privateKey: "", dataCenterId: (row.dataCenter as { id?: string })?.id ?? "",
      gpuTopology: row.gpuTopology || "{}", status: row.status,
    })
    setFormError(""); setPreTestResult(null); setDialogOpen(true)
  }
  const save = async () => {
    setSubmitting(true); setFormError("")
    try {
      const usingKeyProfile = !!selectedKeyProfileId
      if (!editingId && !usingKeyProfile && !looksLikePrivateKey(form.privateKey)) {
        setFormError("请选择凭证或提供有效 SSH 私钥"); return
      }
      const payload: Record<string, unknown> = {
        ipAddress: form.ipAddress.trim(), sshPort: form.sshPort, username: form.username.trim(),
        dataCenter: form.dataCenterId ? { id: form.dataCenterId } : null,
        gpuTopology: form.gpuTopology, status: form.status,
      }
      if (usingKeyProfile) {
        payload.sshKeyProfileId = selectedKeyProfileId
      } else if (form.privateKey.trim()) {
        if (!looksLikePrivateKey(form.privateKey)) { setFormError("私钥格式不正确"); return }
        payload.privateKeyEncrypted = form.privateKey
      }
      if (editingId) await apiClient.updateServer(editingId, payload)
      else await apiClient.createServer(payload)
      setDialogOpen(false); await fetchServers()
      toast.success(editingId ? "节点更新成功" : "节点添加成功")
    } catch (e: any) {
      toast.error("操作失败")
      setFormError(e?.response?.data?.error || "保存失败")
    }
    finally { setSubmitting(false) }
  }
  const remove = async (id: string) => {
    try { await apiClient.deleteServer(id); setDeleteConfirm(null); await fetchServers(); toast.success("节点已删除") } catch {}
  }
  const openDeployDialog = (id: string) => {
    setDeployServerId(id); setDeployTemplateId(""); setDeployDialogOpen(true)
  }
  const confirmDeploy = async () => {
    if (!deployServerId) return
    setDeploying(true)
    try {
      await apiClient.startProvision(deployServerId, deployTemplateId || undefined)
      setDeployDialogOpen(false); await fetchServers(); toast.success("部署已启动")
    } catch { toast.error("部署启动失败") }
    finally { setDeploying(false) }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(s => s.id)))
  }
  const batchDeploy = async () => {
    if (selectedIds.size === 0) return
    setBatchDeploying(true)
    let ok = 0
    const ids = Array.from(selectedIds)
    for (let i = 0; i < ids.length; i++) {
      try { await apiClient.startProvision(ids[i]); ok++ } catch {}
    }
    setBatchDeploying(false); setSelectedIds(new Set()); await fetchServers()
    toast.success(`批量部署已启动 ${ok}/${ids.length} 台`)
  }
  const batchRollback = async () => {
    if (selectedIds.size === 0) return
    setBatchRolling(true)
    let ok = 0
    const ids = Array.from(selectedIds)
    for (let i = 0; i < ids.length; i++) {
      try { await apiClient.rollbackProvision(ids[i]); ok++ } catch {}
    }
    setBatchRolling(false); setSelectedIds(new Set()); await fetchServers()
    toast.success(`批量回滚已启动 ${ok}/${ids.length} 台`)
  }
  const openBatchAdd = () => {
    setBatchKeyProfileId(""); setBatchDcId(dcFilter || ""); setBatchNodesText("")
    setBatchGpuTopology('{"gpu_count":8,"gpu_model":"H100","nvlink":true}')
    setBatchDialogOpen(true)
  }

  const batchAdd = async () => {
    if (!batchKeyProfileId) { toast.error("请选择 SSH 凭证"); return }
    const lines = batchNodesText.trim().split("\n").filter(l => l.trim())
    if (lines.length === 0) { toast.error("请输入至少一个节点"); return }

    const nodes = lines.map(line => {
      const parts = line.trim().split(/[\s,:]+/)
      const ip = parts[0]
      const port = parts.length > 1 ? parseInt(parts[1], 10) : 22
      return { ipAddress: ip, sshPort: isNaN(port) ? 22 : port }
    })

    setBatchSubmitting(true)
    try {
      const result = await apiClient.batchCreateServers({
        sshKeyProfileId: batchKeyProfileId,
        dataCenterId: batchDcId || undefined,
        gpuTopology: batchGpuTopology || undefined,
        nodes,
      })
      setBatchDialogOpen(false); await fetchServers()
      toast.success(`批量添加完成：${result.created} 台成功${result.failed > 0 ? `，${result.failed} 台失败` : ""}`)
    } catch { toast.error("批量添加失败") }
    finally { setBatchSubmitting(false) }
  }

  const testServerConnection = async (id: string) => {
    setTestingConnection(id)
    try {
      const result = await apiClient.testServerConnection(id)
      if (result.reachable) {
        toast.success(`连接正常 — ${result.ip}`)
      } else {
        toast.error(`连接失败 — ${result.error || "无法连接"}`)
      }
      await fetchServers()
    } catch { toast.error("连接测试失败") }
    finally { setTestingConnection(null) }
  }

  const testPreCreate = async () => {
    if (!form.ipAddress || !form.username) {
      setPreTestResult({ reachable: false, error: "请先填写 IP 和用户名" }); return
    }
    if (!selectedKeyProfileId && !form.privateKey) {
      setPreTestResult({ reachable: false, error: "请选择凭证或填写私钥" }); return
    }
    setPreTestLoading(true); setPreTestResult(null)
    try {
      const payload: any = {
        ipAddress: form.ipAddress.trim(), sshPort: form.sshPort,
        username: form.username.trim(),
      }
      if (selectedKeyProfileId) {
        payload.sshKeyProfileId = selectedKeyProfileId
      } else {
        payload.privateKey = form.privateKey
      }
      const result = await apiClient.testConnectionPreCreate(payload)
      setPreTestResult(result)
      if (result.reachable) toast.success("连接测试通过")
      else toast.error(`连接失败 — ${result.error || "无法连接"}`)
    } catch { setPreTestResult({ reachable: false, error: "测试请求失败" }) }
    finally { setPreTestLoading(false) }
  }

  const rollback = async (id: string) => {
    try { await apiClient.rollbackProvision(id); await fetchServers(); toast.success("回滚已启动") } catch {}
  }
  const openRotateKey = (s: ServerRow) => {
    setKeyRotateServer(s); setNewPrivateKey(""); setKeyError(""); setKeyDialogOpen(true)
  }
  const rotateKey = async () => {
    if (!keyRotateServer) return
    if (!looksLikePrivateKey(newPrivateKey)) { setKeyError("请输入有效 SSH 私钥"); return }
    setKeySubmitting(true)
    try {
      await apiClient.rotateServerPrivateKey(keyRotateServer.id, newPrivateKey)
      setKeyDialogOpen(false); await fetchServers()
      toast.success("私钥更新成功")
    } catch (e: any) { setKeyError(e?.response?.data?.error || "更新失败") }
    finally { setKeySubmitting(false) }
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 flex items-center justify-center border border-cyan-500/10">
              <Server className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">GPU 节点管理</h2>
              <p className="text-xs text-slate-500">SSH 私钥认证 · 裸金属 GPU 服务器</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchServers}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />刷新
            </Button>
            <Button variant="outline" size="sm" onClick={openBatchAdd}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />批量添加
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />添加节点
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-5 gap-3 animate-fade-up stagger-1">
          {[
            { label: "总节点", val: stats.total, icon: Server, color: "text-slate-300" },
            { label: "已就绪", val: stats.ok, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "部署中", val: stats.run, icon: Loader2, color: "text-blue-400" },
            { label: "异常", val: stats.fail, icon: AlertTriangle, color: "text-red-400" },
            { label: "GPU 卡数", val: stats.gpus, icon: Cpu, color: "text-violet-400" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-4 w-4 ${s.color} flex-shrink-0`} />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-lg font-bold font-mono ${s.color}`}>{loading ? "—" : s.val}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="animate-fade-up stagger-2">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                <select className={`${inputCls} pl-9`} value={dcFilter} onChange={(e) => setDcFilter(e.target.value)}>
                  <option value="">全部数据中心</option>
                  {datacenters.map((dc) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                </select>
              </div>
              <select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">全部状态</option>
                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                <input className={`${inputCls} pl-9`} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索 IP / 用户名 / 数据中心" />
              </div>
              <Button variant="outline" size="sm" className="h-auto" onClick={() => { setKeyword(""); setStatusFilter("") }}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />重置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Server list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
            <span className="ml-3 text-sm text-slate-500">加载中...</span>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Server className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">没有匹配的节点记录</p>
              <p className="text-xs text-slate-600 mt-1">尝试调整筛选条件，或添加新节点</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 animate-fade-up stagger-3">
            {/* Batch actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                <span className="text-xs text-cyan-400">已选 <span className="font-mono font-bold">{selectedIds.size}</span> 台</span>
                <Button size="sm" className="h-7 text-xs" onClick={batchDeploy} disabled={batchDeploying}>
                  {batchDeploying ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Rocket className="h-3 w-3 mr-1" />}批量部署
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={batchRollback} disabled={batchRolling}>
                  {batchRolling ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Undo2 className="h-3 w-3 mr-1" />}批量回滚
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
              </div>
            )}
            {/* Table header */}
            <div className="grid grid-cols-[auto_2fr_1fr_1.5fr_1fr_1.2fr_auto] gap-4 px-5 py-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              <input type="checkbox" className="accent-cyan-500 h-3.5 w-3.5 cursor-pointer" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
              <span>节点地址</span>
              <span>部署状态</span>
              <span>GPU 配置</span>
              <span>数据中心</span>
              <span>连接状态</span>
              <span className="text-right">操作</span>
            </div>

            {filtered.map((s) => {
              const dc = (s.dataCenter as { name?: string })?.name ?? "—"
              const gpu = parseGpu(s.gpuTopology)
              const cfg = statusConfig[s.status] ?? statusConfig.PENDING
              const prog = s.status === "PROVISIONED" ? 100 : s.status === "PROVISIONING" ? 55 : s.status === "FAILED" ? 100 : 10

              const conn = connectConfig[s.connectStatus || "UNKNOWN"] ?? connectConfig.UNKNOWN

              return (
                <Card key={s.id} className="group">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-[auto_2fr_1fr_1.5fr_1fr_1.2fr_auto] gap-4 items-center px-5 py-4">
                      <input type="checkbox" className="accent-cyan-500 h-3.5 w-3.5 cursor-pointer" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} />
                      {/* IP + user */}
                      <div>
                        <Link href={`/servers/${s.id}`} className="text-sm font-mono text-white hover:text-cyan-400 transition-colors">{s.ipAddress}</Link>
                        <p className="text-xs text-slate-500">{s.username}@:{s.sshPort ?? 22}</p>
                      </div>

                      {/* Deploy Status */}
                      <div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>

                      {/* GPU */}
                      <div className="flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5 text-violet-400/60 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-slate-300">{gpu.text}</p>
                          {gpu.nvlink && <p className="text-[10px] text-violet-400/60">NVLink</p>}
                        </div>
                      </div>

                      {/* Data center */}
                      <p className="text-sm text-slate-400 truncate">{dc}</p>

                      {/* Connect status */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs ${conn.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${conn.dot} ${s.connectStatus === "ONLINE" ? "animate-pulse" : ""}`} />
                          {conn.label}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => testServerConnection(s.id)} disabled={testingConnection === s.id} title="测试连接">
                          {testingConnection === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
                        </Button>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="系统详情">
                          <Link href={`/servers/${s.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)} title="编辑">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openRotateKey(s)} title="更新私钥">
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-cyan-400/70 hover:text-cyan-300" onClick={() => openDeployDialog(s.id)} title="部署">
                          <Rocket className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => rollback(s.id)} title="回滚">
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                        {deleteConfirm === s.id ? (
                          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => remove(s.id)}>确认</Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400/50 hover:text-red-400" onClick={() => setDeleteConfirm(s.id)} title="删除">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="px-5 pb-3">
                      <Progress value={prog} className="h-1" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#0b1120] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? "编辑节点" : "添加 GPU 节点"}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">IP 地址 *</label>
              <input className={inputCls} value={form.ipAddress} onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))} placeholder="192.168.1.10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">SSH 端口</label>
              <input type="number" className={inputCls} value={form.sshPort} onChange={(e) => setForm((f) => ({ ...f, sshPort: parseInt(e.target.value, 10) || 22 }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">SSH 用户名 *</label>
              <input className={inputCls} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="root" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">数据中心</label>
              <select className={inputCls} value={form.dataCenterId} onChange={(e) => setForm((f) => ({ ...f, dataCenterId: e.target.value }))}>
                <option value="">—</option>
                {datacenters.map((dc) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-400">SSH 认证</label>
              <select className={inputCls} value={selectedKeyProfileId} onChange={(e) => setSelectedKeyProfileId(e.target.value)}>
                <option value="">手动输入私钥</option>
                {keyProfiles.map(k => <option key={k.id} value={k.id}>{k.name} ({k.username})</option>)}
              </select>
            </div>
            {!selectedKeyProfileId && (
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-slate-400">
                  SSH 私钥 {!editingId ? "*" : "(留空不变)"}
                </label>
                <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-3 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors">
                  <Upload className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {form.privateKey ? (
                      <div className="flex items-center gap-2">
                        <FileKey className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs text-emerald-400">密钥已加载 ({form.privateKey.length} 字符)</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">点击选择私钥文件</span>
                    )}
                  </div>
                  <input type="file" className="hidden" accept=".pem,.key,*" onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        const text = ev.target?.result as string
                        if (text) setForm(f => ({ ...f, privateKey: text }))
                      }
                      reader.readAsText(file)
                    }
                    e.target.value = ""
                  }} />
                </label>
                {form.privateKey && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600 font-mono truncate flex-1">{form.privateKey.substring(0, 50)}...</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-400" onClick={() => setForm(f => ({ ...f, privateKey: "" }))}>清除</Button>
                  </div>
                )}
              </div>
            )}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-400">GPU 拓扑 (JSON)</label>
              <textarea className={`${inputCls} font-mono text-xs`} rows={2} value={form.gpuTopology} onChange={(e) => setForm((f) => ({ ...f, gpuTopology: e.target.value }))} placeholder='{"gpu_count":8,"gpu_model":"H100","nvlink":true}' />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">初始状态</label>
              <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/5 rounded-lg px-3 py-2 border border-red-400/10">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          {preTestResult && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${preTestResult.reachable ? "text-emerald-400 bg-emerald-400/5 border-emerald-400/10" : "text-red-400 bg-red-400/5 border-red-400/10"}`}>
              {preTestResult.reachable ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <WifiOff className="h-4 w-4 flex-shrink-0" />}
              {preTestResult.reachable ? "连接测试通过" : (preTestResult.error || "连接失败")}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button variant="outline" onClick={testPreCreate} disabled={preTestLoading || !form.ipAddress.trim() || !form.username.trim() || (!selectedKeyProfileId && !form.privateKey.trim())}>
              {preTestLoading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />测试中</> : <><Zap className="h-3.5 w-3.5 mr-1.5" />测试连接</>}
            </Button>
            <Button onClick={save} disabled={!form.ipAddress.trim() || !form.username.trim() || submitting}>
              {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />提交中</> : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!selectedServer} onOpenChange={(open) => !open && setSelectedServer(null)}>
        <DialogContent className="bg-[#0b1120] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white font-mono">{selectedServer?.ipAddress}</DialogTitle>
          </DialogHeader>
          {selectedServer && (() => {
            const gpu = parseGpu(selectedServer.gpuTopology)
            const cfg = statusConfig[selectedServer.status] ?? statusConfig.PENDING
            return (
              <div className="space-y-3">
                {[
                  ["SSH 端口", `${selectedServer.sshPort ?? 22}`],
                  ["用户名", selectedServer.username],
                  ["认证方式", "SSH 私钥"],
                  ["GPU", gpu.text],
                  ["NVLink", gpu.nvlink ? "是" : "否"],
                  ["数据中心", (selectedServer.dataCenter as { name?: string })?.name ?? "—"],
                  ["部署版本", selectedServer.lastDeploymentVersion || "—"],
                  ["创建时间", selectedServer.createdAt || "—"],
                  ["更新时间", selectedServer.updatedAt || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-xs text-slate-500">{k}</span>
                    <span className="text-sm text-slate-300 font-mono">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500">状态</span>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedServer(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate key dialog */}
      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent className="max-w-xl bg-[#0b1120] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-cyan-400" />
              更新 SSH 私钥
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-400 bg-white/[0.02] rounded-lg px-3 py-2.5 border border-white/[0.06]">
              <Server className="h-4 w-4 text-slate-500" />
              <span className="font-mono">{keyRotateServer?.ipAddress}</span>
            </div>
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-3 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors">
              <Upload className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {newPrivateKey ? (
                  <div className="flex items-center gap-2">
                    <FileKey className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-400">新密钥已加载 ({newPrivateKey.length} 字符)</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">点击选择新私钥文件</span>
                )}
              </div>
              <input type="file" className="hidden" accept=".pem,.key,*" onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (ev) => { const t = ev.target?.result as string; if (t) setNewPrivateKey(t) }
                  reader.readAsText(file)
                }
                e.target.value = ""
              }} />
            </label>
            {newPrivateKey && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 font-mono truncate flex-1">{newPrivateKey.substring(0, 50)}...</span>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-400" onClick={() => setNewPrivateKey("")}>清除</Button>
              </div>
            )}
            {keyError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/5 rounded-lg px-3 py-2 border border-red-400/10">
                <XCircle className="h-4 w-4 flex-shrink-0" />{keyError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyDialogOpen(false)}>取消</Button>
            <Button onClick={rotateKey} disabled={keySubmitting || !newPrivateKey.trim()}>
              {keySubmitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />更新中</> : "确认更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Deploy with template dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent className="max-w-md bg-[#0b1120] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Rocket className="h-4 w-4 text-cyan-400" />
              启动部署
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-slate-400">
              对节点 <span className="font-mono text-white">{servers.find(s => s.id === deployServerId)?.ipAddress}</span> 执行自动化部署
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">选择配置模板（可选）</label>
              <select className={inputCls} value={deployTemplateId} onChange={(e) => setDeployTemplateId(e.target.value)}>
                <option value="">默认配置（不使用模板）</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name} {t.version ? `v${t.version}` : ""}</option>)}
              </select>
              {deployTemplateId && templates.find(t => t.id === deployTemplateId)?.description && (
                <p className="text-xs text-slate-600 mt-1">{templates.find(t => t.id === deployTemplateId)?.description}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>取消</Button>
            <Button onClick={confirmDeploy} disabled={deploying}>
              {deploying ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />部署中</> : "确认部署"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Batch add dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#0b1120] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-cyan-400" />
              批量添加节点
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">选择 SSH 凭证 *</label>
                <select className={inputCls} value={batchKeyProfileId} onChange={e => setBatchKeyProfileId(e.target.value)}>
                  <option value="">请选择...</option>
                  {keyProfiles.map(k => <option key={k.id} value={k.id}>{k.name} ({k.username})</option>)}
                </select>
                {keyProfiles.length === 0 && (
                  <p className="text-[10px] text-amber-400">还没有凭证，请先到「凭证管理」页面创建</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">数据中心</label>
                <select className={inputCls} value={batchDcId} onChange={e => setBatchDcId(e.target.value)}>
                  <option value="">—</option>
                  {datacenters.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">GPU 拓扑 (JSON，所有节点统一)</label>
              <input className={`${inputCls} font-mono text-xs`} value={batchGpuTopology} onChange={e => setBatchGpuTopology(e.target.value)} placeholder='{"gpu_count":8,"gpu_model":"H100","nvlink":true}' />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">节点列表 * <span className="text-slate-600 font-normal ml-1">每行一个，格式: IP 端口 或 IP:端口</span></label>
              <textarea className={`${inputCls} font-mono text-xs`} rows={10} value={batchNodesText} onChange={e => setBatchNodesText(e.target.value)} placeholder={"10.0.1.101 22\n10.0.1.102 22\n10.0.1.103:2222\n10.0.1.104"} />
              <p className="text-[10px] text-slate-600">
                已输入 <span className="text-white font-mono">{batchNodesText.trim().split("\n").filter(l => l.trim()).length}</span> 个节点
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>取消</Button>
            <Button onClick={batchAdd} disabled={batchSubmitting || !batchKeyProfileId || !batchNodesText.trim()}>
              {batchSubmitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />提交中</> : "批量创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
