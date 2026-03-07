"use client"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, XCircle, Circle, Loader2 } from "lucide-react"

interface ProvisionCardProps {
  title: string
  status: "pending" | "running" | "completed" | "failed" | "rollback"
  progress?: number
  description?: string
  steps?: Array<{ name: string; completed: boolean; failed?: boolean }>
}

const statusConfig = {
  pending: {
    label: "等待中",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  running: {
    label: "执行中",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
  completed: {
    label: "已完成",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  failed: {
    label: "失败",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  rollback: {
    label: "回滚中",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
}

export function ProvisionCard({
  title,
  status,
  progress,
  description,
  steps,
}: ProvisionCardProps) {
  const config = statusConfig[status]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-mono text-slate-300">{title}</p>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
            config.bg,
            config.color,
            config.border
          )}
        >
          {status === "running" && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
            </span>
          )}
          {config.label}
        </span>
      </div>

      {progress !== undefined && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">进度</span>
            <span className="text-xs font-mono text-slate-400">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {steps && steps.length > 0 && (
        <div className="space-y-0">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            const isActive = !step.completed && !step.failed && index > 0 && steps[index - 1]?.completed
            return (
              <div key={index} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  ) : step.failed ? (
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 text-cyan-400 animate-spin flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-600 flex-shrink-0" />
                  )}
                  {!isLast && (
                    <div
                      className={cn(
                        "w-px flex-1 min-h-[16px]",
                        step.completed ? "bg-emerald-400/30" : "bg-white/[0.06]"
                      )}
                    />
                  )}
                </div>
                <div className={cn(
                  "pb-3 text-sm",
                  step.completed
                    ? "text-slate-300"
                    : step.failed
                      ? "text-red-400"
                      : isActive
                        ? "text-cyan-400"
                        : "text-slate-600"
                )}>
                  {step.name}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
