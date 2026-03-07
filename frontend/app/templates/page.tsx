"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Layout } from "@/components/layout/layout"
import { apiClient } from "@/lib/api"
import {
  FileCode,
  Plus,
  Pencil,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Tag,
  Boxes,
} from "lucide-react"

interface DataCenterRow { id: string; name: string }
interface TemplateRow {
  id: string
  name: string
  description?: string
  variables?: string
  ansibleVars?: string
  version?: string
  enabled?: boolean
  createdBy?: string
  dataCenter?: DataCenterRow | { id: string; name: string }
}

const defaultForm = {
  name: "",
  description: "",
  variables: "{}",
  ansibleVars: "{}",
  version: "1.0",
  enabled: true,
  dataCenterId: "",
}

const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"

export default function TemplatesPage() {
  const [list, setList] = useState<TemplateRow[]>([])
  const [datacenters, setDatacenters] = useState<DataCenterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dcFilter, setDcFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchDc = async () => {
    try {
      const data = await apiClient.getDataCenters()
      setDatacenters(Array.isArray(data) ? data : [])
    } catch { setDatacenters([]) }
  }
  const fetchList = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getTemplates(dcFilter || undefined) as unknown as TemplateRow[]
      setList(Array.isArray(data) ? data : [])
    } catch { setList([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDc() }, [])
  useEffect(() => { fetchList() }, [dcFilter])

  const openCreate = () => { setEditingId(null); setForm({ ...defaultForm, dataCenterId: dcFilter }); setDialogOpen(true) }
  const openEdit = (row: TemplateRow) => {
    setEditingId(row.id)
    setForm({
      name: row.name,
      description: row.description ?? "",
      variables: row.variables ?? "{}",
      ansibleVars: row.ansibleVars ?? "{}",
      version: row.version ?? "1.0",
      enabled: row.enabled ?? true,
      dataCenterId: (row.dataCenter as { id?: string })?.id ?? "",
    })
    setDialogOpen(true)
  }
  const save = async () => {
    setSubmitting(true)
    try {
      const payload = {
        name: form.name, description: form.description,
        variables: form.variables, ansibleVars: form.ansibleVars,
        version: form.version, enabled: form.enabled,
        dataCenter: form.dataCenterId ? { id: form.dataCenterId } : null,
      }
      if (editingId) await apiClient.updateTemplate(editingId, payload)
      else await apiClient.createTemplate(payload)
      setDialogOpen(false); fetchList()
      toast.success(editingId ? "模板已更新" : "模板已创建")
    } catch (e) { console.error(e); toast.error("操作失败") }
    finally { setSubmitting(false) }
  }
  const remove = async (id: string) => {
    try { await apiClient.deleteTemplate(id); setDeleteConfirm(null); fetchList(); toast.success("模板已删除") } catch {}
  }

  function parseVars(raw?: string): Record<string, string> {
    try { return JSON.parse(raw || "{}") } catch { return {} }
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 flex items-center justify-center border border-amber-500/10">
              <FileCode className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">配置模板</h2>
              <p className="text-xs text-slate-500">多版本 Driver / CUDA / 部署场景管理</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
              <select className={`${inputCls} pl-9 w-[180px]`} value={dcFilter} onChange={(e) => setDcFilter(e.target.value)}>
                <option value="">全部数据中心</option>
                {datacenters.map((dc) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchList}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />刷新
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />添加模板
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
            <span className="ml-3 text-sm text-slate-500">加载中...</span>
          </div>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Boxes className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">暂无配置模板</p>
              <p className="text-xs text-slate-600 mt-1">创建如 RHEL 8 + Driver 535 + CUDA 12.1 等部署场景</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-up stagger-1">
            {list.map((t) => {
              const dcName = (t.dataCenter as { name?: string })?.name ?? "—"
              const vars = parseVars(t.variables)
              const varKeys = Object.entries(vars).slice(0, 3)

              return (
                <Card key={t.id} className="group">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-600/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileCode className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{t.name}</h3>
                          {t.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {deleteConfirm === t.id ? (
                          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => remove(t.id)}>确认</Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400/50 hover:text-red-400" onClick={() => setDeleteConfirm(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono bg-cyan-400/5 text-cyan-400 border border-cyan-400/10">
                        <Tag className="h-2.5 w-2.5" />
                        v{t.version ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] bg-blue-400/5 text-blue-400 border border-blue-400/10">
                        {dcName}
                      </span>
                      {t.enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] bg-emerald-400/5 text-emerald-400 border border-emerald-400/10">
                          <CheckCircle2 className="h-2.5 w-2.5" />启用
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] bg-slate-400/5 text-slate-500 border border-slate-500/10">
                          <XCircle className="h-2.5 w-2.5" />禁用
                        </span>
                      )}
                    </div>

                    {varKeys.length > 0 && (
                      <div className="space-y-1">
                        {varKeys.map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-slate-600 font-mono">{k}</span>
                            <span className="text-slate-400 font-mono">{v}</span>
                          </div>
                        ))}
                        {Object.keys(vars).length > 3 && (
                          <p className="text-[10px] text-slate-600">+{Object.keys(vars).length - 3} more</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl bg-[#0b1120] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? "编辑配置模板" : "添加配置模板"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">名称 *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例如：CUDA 12.1 + Driver 535" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">描述</label>
              <input className={inputCls} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="多版本部署场景说明" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">版本</label>
                <input className={inputCls} value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="1.0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">关联数据中心</label>
                <select className={inputCls} value={form.dataCenterId} onChange={(e) => setForm((f) => ({ ...f, dataCenterId: e.target.value }))}>
                  <option value="">—</option>
                  {datacenters.map((dc) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">变量 (JSON)</label>
              <textarea className={`${inputCls} font-mono text-xs`} rows={3} value={form.variables} onChange={(e) => setForm((f) => ({ ...f, variables: e.target.value }))} placeholder='{"nvidia_driver_version":"535","cuda_version":"12.1"}' />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Ansible 变量 (JSON)</label>
              <textarea className={`${inputCls} font-mono text-xs`} rows={2} value={form.ansibleVars} onChange={(e) => setForm((f) => ({ ...f, ansibleVars: e.target.value }))} placeholder="{}" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`relative h-5 w-9 rounded-full transition-colors ${form.enabled ? "bg-cyan-500" : "bg-white/[0.1]"}`} onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-slate-400">{form.enabled ? "启用" : "禁用"}</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={save} disabled={!form.name.trim() || submitting}>
              {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />提交中</> : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
