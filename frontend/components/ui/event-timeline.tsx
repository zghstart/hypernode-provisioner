"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface EventTimelineProps {
  events: Array<{
    type: string
    message: string
    timestamp: string
    status: "success" | "warning" | "error" | "info"
  }>
  className?: string
}

export function EventTimeline({ events, className }: EventTimelineProps) {
  const statusColors = {
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }

  const statusLabels = {
    success: "成功",
    warning: "警告",
    error: "错误",
    info: "信息",
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">执行日志</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              暂无事件记录
            </div>
          ) : (
            events.map((event, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 text-sm"
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    statusColors[event.status]
                  )}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{event.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {event.timestamp}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.type.toUpperCase()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
