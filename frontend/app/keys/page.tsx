"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Layout } from "@/components/layout/layout"
import { apiClient } from "@/lib/api"
import {
  KeyRound, Plus, Pencil, Trash2, Server, Loader2, XCircle,
  RefreshCw, Shield, Fingerprint, Clock, Upload, FileKey,
} from "lucide-react"
import { toast } from "sonner"

interface KeyProfile {
  id: string
  name: string
  username: string
  fingerprint?: string
  description?: string
  serverCount?: number
  createdAt?: string
  updatedAt?: string
}

const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"

const defaultForm = { name: "", username: "root", privateKey: "", description: "" }

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyProfile[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchKeys = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getSshKeyProfiles()
      setKeys(Array.isArray(data) ? data : [])
    } catch { setKeys([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchKeys() }, [])

  const openCreate = () => {
    setEditingId(null); setForm({ ...defaultForm }); setFormError(""); setDialogOpen(true)
  }
  const openEdit = (k: KeyProfile) => {
    setEditingId(k.id)
    setForm({ name: k.name, username: k.username, privateKey: "", description: k.description || "" })
    setFormError(""); setDialogOpen(true)
  }
  const save = async () => {
    setSubmitting(true); setFormError("")
    try {
      if (!form.name.trim()) { setFormError("请输入凭证名称"); return }
      if (!form.username.trim()) { setFormError("请输入用户名"); return }
      if (!editingId && !form.privateKey.trim()) { setFormError("请输入 SSH 私钥"); return }

      if (editingId) {
        await apiClient.updateSshKeyProfile(editingId, {
          name: form.name.trim(), username: form.username.trim(),
          privateKey: form.privateKey.trim() || undefined,
          description: form.description.trim() || undefined,
        })
        toast.success("凭证更新成功")
      } else {
        await apiClient.createSshKeyProfile({
          name: form.name.trim(), username: form.username.trim(),
          privateKey: form.privateKey.trim(),
          description: form.description.trim() || undefined,
        })
        toast.success("凭证创建成功")
      }
      setDialogOpen(false); await fetchKeys()
    } catch (e: any) {
      toast.error("操作失败"); setFormError(e?.response?.data?.error || "保存失败")
    } finally { setSubmitting(false) }
  }

  const remove = async (id: string) => {
    try {
      await apiClient.deleteSshKeyProfile(id); setDeleteConfirm(null); await fetchKeys()
      toast.success("凭证已删除")
    } catch (e: any) { toast.error(e?.response?.data?.error || "删除失败") }
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 flex items-center justify-center border border-amber-500/10">
              <KeyRound className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">SSH 凭证管理</h2>
              <p className="text-xs text-slate-500">统一管理 SSH 私钥，多台服务器共享同一凭证</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchKeys}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />刷新
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />添加凭证
            </Button>
          </div>
        </div>

        {/* Key list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
            <span className="ml-3 text-sm text-slate-500">加载中...</span>
          </div>
        ) : keys.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <KeyRound className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">还没有 SSH 凭证</p>
              <p className="text-xs text-slate-600 mt-1">创建凭证后，可在「添加节点」时直接引用</p>
              <Button className="mt-4" size="sm" onClick={openCreate}><Plus className="h-3.5 w-3.5 mr-1.5" />创建第一个凭证</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 animate-fade-up stagger-1">
            {keys.map((k) => (
              <Card key={k.id} className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                        <KeyRound className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">{k.name}</h4>
                        <p className="text-xs text-slate-500 font-mono">{k.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(k)} title="编辑">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {deleteConfirm === k.id ? (
                        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => remove(k.id)}>确认</Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400/50 hover:text-red-400" onClick={() => setDeleteConfirm(k.id)} title="删除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {k.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{k.description}</p>}

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <Server className="h-3 w-3 text-cyan-400/60" />
                      <span className="text-xs text-slate-400">{k.serverCount ?? 0} 台关联</span>
                    </div>
                    {k.fingerprint && (
                      <div className="flex items-center gap-1.5">
                        <Fingerprint className="h-3 w-3 text-emerald-400/60" />
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">{k.fingerprint}</span>
                      </div>
                    )}
                    {k.createdAt && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Clock className="h-3 w-3 text-slate-600" />
                        <span className="text-[10px] text-slate-600">{String(k.createdAt).slice(0, 10)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#0b1120] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-400" />
              {editingId ? "编辑凭证" : "添加 SSH 凭证"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">凭证名称 *</label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例如: 生产集群A / GPU训练节点" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">SSH 用户名 *</label>
              <input className={inputCls} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="root" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                SSH 私钥 {!editingId ? "*" : "(留空不更新)"}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-3 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors">
                  <Upload className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {form.privateKey ? (
                      <div className="flex items-center gap-2">
                        <FileKey className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs text-emerald-400">密钥已加载 ({form.privateKey.length} 字符)</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">点击选择私钥文件 (id_rsa / id_ed25519 等)</span>
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
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-400">备注说明</label>
              <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="可选：描述此凭证的用途或范围" />
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/5 rounded-lg px-3 py-2 border border-red-400/10">
              <XCircle className="h-4 w-4 flex-shrink-0" />{formError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={save} disabled={submitting}>
              {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />提交中</> : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
