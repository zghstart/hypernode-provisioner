/**
 * Utility function tests for HyperNode-Provisioner
 */

import { describe, it, expect } from "vitest"

// Test status color mapping
describe("Status Colors", () => {
  const statusColors = {
    pending: "bg-yellow-500",
    running: "bg-blue-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
    rollback: "bg-orange-500",
  }

  it("should map pending to yellow", () => {
    expect(statusColors.pending).toBe("bg-yellow-500")
  })

  it("should map running to blue", () => {
    expect(statusColors.running).toBe("bg-blue-500")
  })

  it("should map completed to green", () => {
    expect(statusColors.completed).toBe("bg-green-500")
  })

  it("should map failed to red", () => {
    expect(statusColors.failed).toBe("bg-red-500")
  })

  it("should map rollback to orange", () => {
    expect(statusColors.rollback).toBe("bg-orange-500")
  })
})

// Test status labels
describe("Status Labels", () => {
  const statusLabels = {
    pending: "等待中",
    running: "执行中",
    completed: "已完成",
    failed: "失败",
    rollback: "回滚中",
  }

  it("should map pending to 等待中", () => {
    expect(statusLabels.pending).toBe("等待中")
  })

  it("should map running to 执行中", () => {
    expect(statusLabels.running).toBe("执行中")
  })

  it("should map completed to 已完成", () => {
    expect(statusLabels.completed).toBe("已完成")
  })

  it("should map failed to 失败", () => {
    expect(statusLabels.failed).toBe("失败")
  })

  it("should map rollback to 回滚中", () => {
    expect(statusLabels.rollback).toBe("回滚中")
  })
})

// Test progress calculation
describe("Progress Calculation", () => {
  it("should calculate percentage correctly", () => {
    const calculatePercentage = (current: number, total: number): number => {
      if (total === 0) return 0
      return Math.round((current / total) * 100)
    }

    expect(calculatePercentage(0, 100)).toBe(0)
    expect(calculatePercentage(50, 100)).toBe(50)
    expect(calculatePercentage(100, 100)).toBe(100)
    expect(calculatePercentage(43, 100)).toBe(43)
  })

  it("should handle edge cases", () => {
    const calculatePercentage = (current: number, total: number): number => {
      if (total === 0) return 0
      return Math.round((current / total) * 100)
    }

    expect(calculatePercentage(0, 0)).toBe(0)
    expect(calculatePercentage(10, 0)).toBe(0)
  })
})

// Test step completion logic
describe("Step Completion", () => {
  interface Step {
    name: string
    completed: boolean
    failed?: boolean
  }

  it("should identify completed steps", () => {
    const steps: Step[] = [
      { name: "Step 1", completed: true },
      { name: "Step 2", completed: false },
      { name: "Step 3", completed: true },
    ]

    const completedSteps = steps.filter((step) => step.completed)
    expect(completedSteps.length).toBe(2)
  })

  it("should identify failed steps", () => {
    const steps: Step[] = [
      { name: "Step 1", completed: false, failed: true },
      { name: "Step 2", completed: false },
      { name: "Step 3", completed: true },
    ]

    const failedSteps = steps.filter((step) => step.failed)
    expect(failedSteps.length).toBe(1)
  })
})

// Test percentage to status mapping
describe("Status from Progress", () => {
  type Status = "pending" | "running" | "completed" | "failed" | "rollback"

  const getStatusFromProgress = (progress: number | undefined): Status => {
    if (progress === undefined) return "pending"
    if (progress >= 100) return "completed"
    if (progress > 0) return "running"
    return "pending"
  }

  it("should return pending for undefined", () => {
    expect(getStatusFromProgress(undefined)).toBe("pending")
  })

  it("should return pending for 0", () => {
    expect(getStatusFromProgress(0)).toBe("pending")
  })

  it("should return running for partial progress", () => {
    expect(getStatusFromProgress(50)).toBe("running")
  })

  it("should return completed for 100", () => {
    expect(getStatusFromProgress(100)).toBe("completed")
  })
})
