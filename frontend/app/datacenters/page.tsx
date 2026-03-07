"use client"

import { useEffect, useState } from "react"
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
  Activity,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

interface DataCenterRow {
  id: string
  name: string
  httpProxy?: string
  httpsProxy?: string
  aptMirror?: string
  huggingfaceMirror?: string
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
}

const defaultForm = {
  name: "",
  httpProxy: "",
  httpsProxy: "",
  aptMirror: "",
  huggingfaceMirror: "",
  enabled: true,
}

const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"

export default function DataCentersPage() {
  const [list, setList] = useState<DataCenterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchList = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getDataCenters()
      setList(Array.isArray(data) ? data : [])
    } catch { setList([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchList() }, [])

  const openCreate = () => { setEditingId(null); setForm(defaultForm); setDialogOpen(true) }
  const openEdit = (row: DataCenterRow) => {
    setEditingId(row.id)
    setForm({
      name: row.name,
      httpProxy: row.httpProxy ?? "",
      httpsProxy: row.httpsProxy ?? "",
      aptMirror: row.aptMirror ?? "",
      huggingfaceMirror: row.huggingfaceMirror ?? "",
      enabled: row.enabled ?? true,
    })
    setDialogOpen(true)
  }
  const save = async () => {
    setSubmitting(true)
    try {
      if (editingId) await apiClient.updateDataCenter(editingId, form)
      else await apiClient.createDataCenter(form)
      setDialogOpen(false); fetchList()
      toast.success(editingId ? "数据中心已更新" : "数据中心已创建")
    } catch (e) { console.error(e); toast.error("操作失败") }
    finally { setSubmitting(false) }
  }
  const remove = async (id: string) => {
    try { await apiClient.deleteDataCenter(id); setDeleteConfirm(null); fetchList(); toast.success("数据中心已删除") } catch {}
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/10 flex items-center justify-center border border-blue-500/10">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">数据中心</h2>
              <p className="text-xs text-slate-500">代理配置 · 镜像源 · 多区域管理</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchList}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />刷新
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />添加数据中心
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
              <Globe className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">暂无数据中心</p>
              <p className="text-xs text-slate-600 mt-1">点击「添加数据中心」创建第一个</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-up stagger-1">
            {list.map((dc) => (
              <Card key={dc.id} className="group">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-600/5 flex items-center justify-center">
                        <Globe className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{dc.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {dc.enabled ? (
                            <><CheckCircle2 className="h-3 w-3 text-emerald-400" /><span className="text-[10px] text-emerald-400">启用</span></>
                          ) : (
                            <><XCircle className="h-3 w-3 text-slate-500" /><span className="text-[10px] text-slate-500">禁用</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(dc)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {deleteConfirm === dc.id ? (
                        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => remove(dc.id)}>确认</Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400/50 hover:text-red-400" onClick={() => setDeleteConfirm(dc.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {[
                      ["HTTP 代理", dc.httpProxy],
                      ["HTTPS 代理", dc.httpsProxy],
                      ["APT 镜像", dc.aptMirror],
                      ["HF 镜像", dc.huggingfaceMirror],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                        <span className="text-xs text-slate-500">{label}</span>
                        <span className="text-xs text-slate-400 font-mono truncate max-w-[180px]" title={value || ""}>
                          {value || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0b1120] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? "编辑数据中心" : "添加数据中心"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">名称 *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例如：华东1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">HTTP 代理</label>
                <input className={inputCls} value={form.httpProxy} onChange={(e) => setForm((f) => ({ ...f, httpProxy: e.target.value }))} placeholder="http://proxy:8080" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">HTTPS 代理</label>
                <input className={inputCls} value={form.httpsProxy} onChange={(e) => setForm((f) => ({ ...f, httpsProxy: e.target.value }))} placeholder="https://proxy:8080" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">APT 镜像</label>
              <input className={inputCls} value={form.aptMirror} onChange={(e) => setForm((f) => ({ ...f, aptMirror: e.target.value }))} placeholder="https://mirrors.xxx.com/ubuntu" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">HuggingFace 镜像</label>
              <input className={inputCls} value={form.huggingfaceMirror} onChange={(e) => setForm((f) => ({ ...f, huggingfaceMirror: e.target.value }))} placeholder="https://hf-mirror.com" />
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
