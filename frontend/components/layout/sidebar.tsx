"use client"

import React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Server,
  Play,
  Settings,
  Activity,
  FileCode,
  Cpu,
  Gauge,
  ShieldCheck,
  KeyRound,
} from "lucide-react"

const navItems = [
  { title: "控制台", href: "/", icon: LayoutDashboard },
  { title: "数据中心", href: "/datacenters", icon: Activity },
  { title: "凭证管理", href: "/keys", icon: KeyRound },
  { title: "节点管理", href: "/servers", icon: Server },
  { title: "部署任务", href: "/tasks", icon: Play },
  { title: "性能测试", href: "/performance", icon: Cpu },
  { title: "压测监控", href: "/benchmark", icon: Gauge },
  { title: "配置模板", href: "/templates", icon: FileCode },
  { title: "审计日志", href: "/audit", icon: ShieldCheck },
  { title: "系统设置", href: "/settings", icon: Settings },
]

export const Sidebar = React.memo(function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-[260px] border-r border-white/[0.06] md:flex flex-col relative z-10 bg-[#060a13]/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-900/30">
          <Cpu className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-wide text-white">HyperNode</span>
          <span className="text-[10px] text-cyan-400/70 font-mono tracking-wider">PROVISIONER</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 ml-0"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-l-2 border-transparent"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  <span>{item.title}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </div>
          <span className="text-xs text-slate-400">系统在线</span>
          <span className="ml-auto text-[10px] font-mono text-slate-600">v0.3.0</span>
        </div>
      </div>
    </aside>
  )
})
