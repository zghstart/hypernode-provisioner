"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, RefreshCw, Clock, BarChart3, HardDrive, Cpu, Network, Zap, Layers, Server } from 'lucide-react'
import { apiClient } from "@/lib/api"
type ServerType = any

interface TestResult {
  id: string
  serverId: string
  testType: string
  testConfig: string
  testResult: string
  status: string
  startedAt: string
  completedAt: string
  durationSeconds: number
  errorMessage: string
  createdAt: string
  updatedAt: string
}

interface TestConfig {
  [key: string]: any
}

interface TestResultData {
  [key: string]: any
}

export default function PerformanceTestPage() {
  const [servers, setServers] = useState<ServerType[]>([])
  const [selectedServer, setSelectedServer] = useState<string>('')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [selectedTest, setSelectedTest] = useState<string>('env_check')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [testDuration, setTestDuration] = useState<number>(120)
  const [matrixSize, setMatrixSize] = useState<number>(8192)
  const [testType, setTestType] = useState<string>('all_reduce')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  // 测试类型配置
  const testTypes = [
    { value: 'env_check', label: '环境检查', icon: <Server className="h-4 w-4" />, description: '检查系统硬件配置、驱动版本等基础信息' },
    { value: 'gemm', label: 'GEMM 测试', icon: <Cpu className="h-4 w-4" />, description: '测试矩阵乘法性能，评估 GPU 计算能力' },
    { value: 'memory_bandwidth', label: '显存带宽', icon: <Zap className="h-4 w-4" />, description: '测试 HBM3 显存带宽性能' },
    { value: 'disk_io', label: '磁盘 I/O', icon: <HardDrive className="h-4 w-4" />, description: '测试磁盘顺序读写速度' },
    { value: 'gpu_topology', label: 'GPU 拓扑', icon: <Layers className="h-4 w-4" />, description: '检查 GPU 拓扑和 NVLink 互联状态' },
    { value: 'nccl', label: 'NCCL 测试', icon: <Network className="h-4 w-4" />, description: '测试多卡通信性能' },
    { value: 'gpu_burn', label: 'GPU-Burn', icon: <Zap className="h-4 w-4" />, description: 'GPU 稳定性压力测试' },
    { value: 'inference', label: '推理测试', icon: <BarChart3 className="h-4 w-4" />, description: 'Transformer 模型推理吞吐量测试' },
  ]

  // 加载服务器列表
  useEffect(() => {
    loadServers()
  }, [])

  const loadServers = async () => {
    try {
      const data = await apiClient.getServers()
      setServers(data)
    } catch (err) {
      console.error('Failed to load servers:', err)
    }
  }

  // 加载测试结果
  useEffect(() => {
    if (selectedServer) {
      loadTestResults()
    }
  }, [selectedServer])

  const loadTestResults = async () => {
    try {
      const results = await apiClient.getPerformanceTestResults(selectedServer)
      setTestResults(results)
    } catch (err) {
      console.error('Failed to load test results:', err)
    }
  }

  // 执行测试
  const runTest = async () => {
    if (!selectedServer) {
      setError('请选择服务器')
      return
    }

    setIsRunning(true)
    setError('')
    setSuccess('')

    try {
      switch (selectedTest) {
        case 'env_check':
          await apiClient.runEnvironmentCheck(selectedServer)
          break
        case 'gemm':
          await apiClient.runGemmTest(selectedServer, matrixSize)
          break
        case 'memory_bandwidth':
          await apiClient.runMemoryBandwidthTest(selectedServer)
          break
        case 'disk_io':
          await apiClient.runDiskIOTest(selectedServer)
          break
        case 'gpu_topology':
          await apiClient.runGpuTopologyTest(selectedServer)
          break
        case 'nccl':
          await apiClient.runNcclTest(selectedServer, testType)
          break
        case 'gpu_burn':
          await apiClient.runGpuBurnTest(selectedServer, testDuration)
          break
        case 'inference':
          await apiClient.runInferenceTest(selectedServer)
          break
      }
      setSuccess('测试已开始执行')
      // 延迟加载结果
      setTimeout(loadTestResults, 2000)
    } catch (err: any) {
      setError(err.message || '测试执行失败')
    } finally {
      setIsRunning(false)
    }
  }

  // 执行全部测试
  const runAllTests = async () => {
    if (!selectedServer) {
      setError('请选择服务器')
      return
    }

    setIsRunning(true)
    setError('')
    setSuccess('')

    try {
      await apiClient.runAllTests(selectedServer)
      setSuccess('全部测试已开始执行')
      // 延迟加载结果
      setTimeout(loadTestResults, 2000)
    } catch (err: any) {
      setError(err.message || '测试执行失败')
    } finally {
      setIsRunning(false)
    }
  }

  // 解析测试结果
  const parseTestResult = (result: string): TestResultData => {
    try {
      return JSON.parse(result)
    } catch {
      return { raw: result }
    }
  }

  // 解析测试配置
  const parseTestConfig = (config: string): TestConfig => {
    try {
      return JSON.parse(config)
    } catch {
      return {}
    }
  }

  // 获取测试类型标签
  const getTestTypeLabel = (testType: string): string => {
    const test = testTypes.find(t => t.value === testType)
    return test?.label || testType
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">性能测试</h1>
        <Button onClick={loadServers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新服务器
        </Button>
      </div>

      {/* 服务器选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-300">服务器选择</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="server" className="text-sm font-medium text-slate-400">选择服务器</label>
            <select 
              id="server" 
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
            >
              <option value="">请选择服务器</option>
              {servers.map(server => (
                <option key={server.id} value={server.id}>
                  {server.ipAddress} - {server.status}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 测试配置 */}
      {selectedServer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-300">测试配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={selectedTest} onValueChange={setSelectedTest} className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                {testTypes.map(test => (
                  <TabsTrigger key={test.value} value={test.value} className="flex items-center gap-2">
                    {test.icon}
                    <span className="text-xs">{test.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value="env_check">
                <p className="text-xs text-slate-400">{testTypes.find(t => t.value === 'env_check')?.description}</p>
              </TabsContent>
              
              <TabsContent value="gemm">
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{testTypes.find(t => t.value === 'gemm')?.description}</p>
                  <div className="space-y-2">
                    <label htmlFor="matrixSize" className="text-sm font-medium text-slate-400">矩阵尺寸</label>
                    <input
                      id="matrixSize"
                      type="number"
                      value={matrixSize}
                      onChange={(e) => setMatrixSize(Number(e.target.value))}
                      min={1024}
                      max={16384}
                      step={1024}
                      className="w-32 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="memory_bandwidth">
                <p className="text-xs text-slate-400">{testTypes.find(t => t.value === 'memory_bandwidth')?.description}</p>
              </TabsContent>
              
              <TabsContent value="disk_io">
                <p className="text-xs text-slate-400">{testTypes.find(t => t.value === 'disk_io')?.description}</p>
              </TabsContent>
              
              <TabsContent value="gpu_topology">
                <p className="text-xs text-slate-400">{testTypes.find(t => t.value === 'gpu_topology')?.description}</p>
              </TabsContent>
              
              <TabsContent value="nccl">
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{testTypes.find(t => t.value === 'nccl')?.description}</p>
                  <div className="space-y-2">
                    <label htmlFor="testType" className="text-sm font-medium text-slate-400">测试类型</label>
                    <select 
                      id="testType"
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                    >
                      <option value="">选择测试类型</option>
                      <option value="all_reduce">AllReduce</option>
                      <option value="all_gather">AllGather</option>
                      <option value="broadcast">Broadcast</option>
                    </select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="gpu_burn">
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{testTypes.find(t => t.value === 'gpu_burn')?.description}</p>
                  <div className="space-y-2">
                    <label htmlFor="duration" className="text-sm font-medium text-slate-400">测试时长 (秒)</label>
                    <input
                      id="duration"
                      type="number"
                      value={testDuration}
                      onChange={(e) => setTestDuration(Number(e.target.value))}
                      min={60}
                      max={3600}
                      step={60}
                      className="w-32 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-colors"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="inference">
                <p className="text-xs text-slate-400">{testTypes.find(t => t.value === 'inference')?.description}</p>
              </TabsContent>
            </Tabs>

            {/* 错误和成功提示 */}
            {error && (
              <div className="mt-4 p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-medium">错误</span>
                  <span className="text-slate-300">{error}</span>
                </div>
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 bg-cyan-400/10 border border-cyan-400/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-medium">成功</span>
                  <span className="text-slate-300">{success}</span>
                </div>
              </div>
            )}

            {/* 执行按钮 */}
            <div className="flex gap-4 mt-4">
              <Button onClick={runTest} disabled={isRunning}>
                {isRunning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                执行测试
              </Button>
              <Button onClick={runAllTests} disabled={isRunning}>
                <Layers className="h-4 w-4 mr-2" />
                全部测试
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 测试结果 */}
      {selectedServer && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">测试结果</CardTitle>
            <button 
              onClick={loadTestResults}
              className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
            >
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="w-24 py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">测试类型</th>
                    <th className="w-24 py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                    <th className="w-24 py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">时长</th>
                    <th className="w-32 py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">开始时间</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">结果</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        暂无测试结果
                      </td>
                    </tr>
                  ) : (
                    testResults.map(result => {
                      const testData = parseTestResult(result.testResult)
                      const config = parseTestConfig(result.testConfig)
                      return (
                        <tr key={result.id} className="border-b border-white/[0.04]">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {testTypes.find(t => t.value === result.testType)?.icon}
                              <span>{getTestTypeLabel(result.testType)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {result.status === 'RUNNING' && <span className="px-2 py-1 text-xs rounded-full bg-blue-400/10 text-blue-400">运行中</span>}
                            {result.status === 'COMPLETED' && <span className="px-2 py-1 text-xs rounded-full bg-slate-400/10 text-slate-400">已完成</span>}
                            {result.status === 'FAILED' && <span className="px-2 py-1 text-xs rounded-full bg-red-400/10 text-red-400">失败</span>}
                          </td>
                          <td className="py-4 px-4">{result.durationSeconds?.toFixed(1)}s</td>
                          <td className="py-4 px-4 text-xs text-slate-400">
                            {new Date(result.startedAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-xs">
                              {result.status === 'FAILED' ? (
                                <span className="text-red-400">{result.errorMessage}</span>
                              ) : result.status === 'COMPLETED' ? (
                                <pre className="whitespace-pre-wrap text-slate-300">
                                  {JSON.stringify(testData, null, 2)}
                                </pre>
                              ) : (
                                <span className="text-slate-400">测试中...</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
