"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ChartContainerProps {
  children: ReactNode
  title: string
  height?: number
  className?: string
}

export function ChartContainer({
  children,
  title,
  height = 400,
  className,
}: ChartContainerProps) {
  return (
    <div className={cn("w-full space-y-4", className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <div
        className="w-full rounded-lg border bg-card p-4"
        style={{ minHeight: height }}
      >
        {children}
      </div>
    </div>
  )
}
