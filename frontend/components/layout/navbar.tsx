"use client"

import { usePathname } from "next/navigation"
import { Bell, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const pageNames: Record<string, string> = {
  "/": "控制台",
  "/datacenters": "数据中心",
  "/keys": "凭证管理",
  "/servers": "节点管理",
  "/tasks": "部署任务",
  "/benchmark": "压测监控",
  "/templates": "配置模板",
  "/audit": "审计日志",
  "/settings": "系统设置",
}

export function Navbar() {
  const pathname = usePathname()
  let pageName = pageNames[pathname] ?? ""
  if (!pageName && pathname.startsWith("/servers/")) pageName = "节点详情"

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#060a13]/70 backdrop-blur-xl">
      <div className="flex h-14 items-center px-6 gap-4">
        <div className="flex items-center gap-2">
          {pageName && (
            <h2 className="text-sm font-medium text-slate-300">
              {pageName}
            </h2>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-300">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-300 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cyan-400" />
          </Button>
          <div className="ml-2 h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-cyan-900/20">
            A
          </div>
        </div>
      </div>
    </header>
  )
}
