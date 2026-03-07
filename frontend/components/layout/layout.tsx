"use client"

import React, { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { Navbar } from "./navbar"

interface LayoutProps {
  children: ReactNode
}

export const Layout = React.memo(function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-[#060a13]">
      <div className="fixed inset-0 bg-dots pointer-events-none opacity-50" />
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-950/20 via-transparent to-blue-950/10 pointer-events-none" />
      <Sidebar />
      <div className="flex flex-1 flex-col relative">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
})
