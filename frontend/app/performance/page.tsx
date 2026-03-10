"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, RefreshCw, Clock, BarChart3, HardDrive, Cpu, Network, Zap, Layers, Server, Code, Eye, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [showScript, setShowScript] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

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
    setIsRefreshing(true)
    try {
      const results = await apiClient.getPerformanceTestResults(selectedServer)
      setTestResults(results)
    } catch (err) {
      console.error('Failed to load test results:', err)
    } finally {
      setIsRefreshing(false)
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
      let response
      switch (selectedTest) {
        case 'env_check':
          response = await apiClient.runEnvironmentCheck(selectedServer)
          break
        case 'gemm':
          response = await apiClient.runGemmTest(selectedServer, matrixSize)
          break
        case 'memory_bandwidth':
          response = await apiClient.runMemoryBandwidthTest(selectedServer)
          break
        case 'disk_io':
          response = await apiClient.runDiskIOTest(selectedServer)
          break
        case 'gpu_topology':
          response = await apiClient.runGpuTopologyTest(selectedServer)
          break
        case 'nccl':
          response = await apiClient.runNcclTest(selectedServer, testType)
          break
        case 'gpu_burn':
          response = await apiClient.runGpuBurnTest(selectedServer, testDuration)
          break
        case 'inference':
          response = await apiClient.runInferenceTest(selectedServer)
          break
        default:
          throw new Error('未知测试类型')
      }
      setSuccess(`测试已开始执行: ${response?.message || '任务已提交'}`)
      // 延迟加载结果
      setTimeout(() => {
        loadTestResults()
        // 每2秒刷新一次结果，持续30秒
        const interval = setInterval(() => {
          loadTestResults()
        }, 2000)
        setTimeout(() => clearInterval(interval), 30000)
      }, 2000)
    } catch (err: any) {
      console.error('测试执行错误:', err)
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
      const response = await apiClient.runAllTests(selectedServer)
      setSuccess(`全部测试已开始执行: ${response?.message || '任务已提交'}`)
      // 延迟加载结果
      setTimeout(() => {
        loadTestResults()
        // 每5秒刷新一次结果，持续60秒
        const interval = setInterval(() => {
          loadTestResults()
        }, 5000)
        setTimeout(() => clearInterval(interval), 60000)
      }, 2000)
    } catch (err: any) {
      console.error('测试执行错误:', err)
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



  // 获取测试脚本内容（模拟）
  const getTestScript = (testType: string): string => {
    const scripts: Record<string, string> = {
      env_check: `#!/bin/bash
echo '{"os": {"name": "'$(cat /etc/os-release | grep -E "^NAME=" | cut -d= -f2 | tr -d '"')'", "version": "'$(cat /etc/os-release | grep -E "^VERSION=" | cut -d= -f2 | tr -d '"')'"}, "cpu": {"model": "'$(lscpu | grep -E "^Model name:" | cut -d: -f2 | xargs)'", "cores": '$(lscpu | grep -E "^Core\(s\)? per socket:" | cut -d: -f2 | xargs)', "threads": '$(lscpu | grep -E "^Thread\(s\)? per core:" | cut -d: -f2 | xargs)'}, "memory": "'$(free -h | grep -E "^Mem:" | awk '{print $2}')'", "gpu": [$(nvidia-smi --query-gpu=index,name,memory.total,driver_version --format=csv,noheader | while IFS=, read -r index name memory driver; do echo '{"index": "$index", "name": "$name", "memory": "$memory", "driver": "$driver"},' done | sed '$s/,$//')], "cuda": "'$(nvcc --version 2>/dev/null || echo "not found")'", "pytorch": "'$(python3 -c \"import torch; print(torch.__version__)\")'"}'`,
      gemm: `#!/usr/bin/env python3
import torch
import time

matrix_size = 8192
warmup_iters = 5
test_iters = 20

# TF32
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
device = torch.device('cuda:0')
A = torch.randn(matrix_size, matrix_size, dtype=torch.float32, device=device)
B = torch.randn(matrix_size, matrix_size, dtype=torch.float32, device=device)

for _ in range(warmup_iters):
    C = torch.mm(A, B)
torch.cuda.synchronize()

start = time.perf_counter()
for _ in range(test_iters):
    C = torch.mm(A, B)
torch.cuda.synchronize()
elapsed = time.perf_counter() - start

flops = 2 * matrix_size * matrix_size * matrix_size
tflops = flops / elapsed / 1e12
print(f'{tflops:.2f}')`,
      memory_bandwidth: `#!/usr/bin/env python3
import torch
import time

test_sizes_mb = [256, 1024]

for size_mb in test_sizes_mb:
    device = torch.device('cuda:0')
    num_elements = size_mb * 1024 * 1024 // 4
    src = torch.randn(num_elements, dtype=torch.float32, device=device)
    dst = torch.empty_like(src)

    # Warmup
    for _ in range(10):
        dst.copy_(src)
    torch.cuda.synchronize()

    # Benchmark
    start = time.perf_counter()
    for _ in range(30):
        dst.copy_(src)
    torch.cuda.synchronize()
    elapsed = time.perf_counter() - start

    bytes_transferred = num_elements * 4 * 2
    bw_gbs = bytes_transferred * 30 / elapsed / 1e9
    print(f'{size_mb}MB: {bw_gbs:.2f} GB/s')`,
      disk_io: `#!/bin/bash
echo '{"/tmp": {"write": "'$(dd if=/dev/zero of=/tmp/test_write.tmp bs=1G count=4 oflag=direct conv=fdatasync 2>&1 | grep -oP '\\d+(\\.\\d+)? [GM]B/s' | tail -1 || echo "N/A")'", "read": "'$(dd if=/tmp/test_write.tmp of=/dev/null bs=1G iflag=direct 2>&1 | grep -oP '\\d+(\\.\\d+)? [GM]B/s' | tail -1 || echo "N/A")'"}}'
rm -f /tmp/test_write.tmp`,
      gpu_topology: `#!/bin/bash
echo '{"topology": "'$(nvidia-smi topo -m | tr '\n' ' ' | sed 's/"/\\"/g')'", "nvlink": [$(for i in $(seq 0 7); do echo '{"gpu": $i, "status": "'$(nvidia-smi nvlink --status -i $i 2>/dev/null | grep -E "(Link|Active)" | tr '\n' ' ' | sed 's/"/\\"/g' || echo "N/A")'"},' done | sed '$s/,$//')]}'`,
      nccl: `#!/usr/bin/env python3
import torch
import torch.distributed as dist
import time
import os

os.environ['MASTER_ADDR'] = 'localhost'
os.environ['MASTER_PORT'] = '29500'
os.environ['RANK'] = '0'
os.environ['WORLD_SIZE'] = '1'

dist.init_process_group(backend='nccl')

test_sizes = [8, 1024**2, 64*1024**2, 256*1024**2, 1024**3]
size_labels = ['8B', '1MB', '64MB', '256MB', '1GB']

for size, label in zip(test_sizes, size_labels):
    try:
        rank = dist.get_rank()
        num_elements = size // 4
        tensor = torch.ones(num_elements, dtype=torch.float32, device=f'cuda:{rank}')

        # Warmup
        for _ in range(5):
            dist.all_reduce(tensor, op=dist.ReduceOp.SUM)
        torch.cuda.synchronize()

        # Benchmark
        start = time.perf_counter()
        for _ in range(20):
            dist.all_reduce(tensor, op=dist.ReduceOp.SUM)
        torch.cuda.synchronize()
        elapsed = time.perf_counter() - start

        avg_us = elapsed / 20 * 1e6
        world_size = dist.get_world_size()
        algo_bw = 2 * (world_size - 1) / world_size * size / (elapsed / 20) / 1e9

        print(f'{label}: {avg_us:.2f} us, {algo_bw:.2f} GB/s')
    except Exception as e:
        print(f'{label}: Error - {e}')

dist.destroy_process_group()`,
      gpu_burn: `#!/bin/bash
# 检查 gpu-burn 是否安装
if [ ! -f /usr/local/bin/gpu-burn ]; then
    # 安装 gpu-burn
    git clone https://github.com/wilicc/gpu-burn /tmp/gpu-burn
    cd /tmp/gpu-burn && make
    cp gpu_burn /usr/local/bin/gpu-burn
fi

# 运行 gpu-burn
/usr/local/bin/gpu-burn 120`,
      inference: `#!/usr/bin/env python3
import torch
import torch.nn as nn
import time

# 模型配置
num_layers = 12
d_model = 1024
nhead = 16
dim_feedforward = 4096
seq_len = 256
dtype = torch.float16
device = torch.device('cuda:0')

# 构建模型
encoder_layer = nn.TransformerEncoderLayer(
    d_model=d_model,
    nhead=nhead,
    dim_feedforward=dim_feedforward,
    batch_first=True,
    dtype=dtype,
    device=device,
)
model = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
model.eval()

# 测试不同 batch size
batch_sizes = [1, 4, 16, 32]

for bs in batch_sizes:
    x = torch.randn(bs, seq_len, d_model, dtype=dtype, device=device)

    # Warmup
    for _ in range(10):
        _ = model(x)
    torch.cuda.synchronize()

    # Benchmark
    start = time.perf_counter()
    for _ in range(50):
        out = model(x)
    torch.cuda.synchronize()
    elapsed = time.perf_counter() - start

    tokens_per_sec = bs * seq_len * 50 / elapsed
    print(f'Batch {bs}: {tokens_per_sec:.2f} tokens/sec')`
    }
    return scripts[testType] || '测试脚本不可用'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">性能测试</h1>
            <p className="text-sm text-slate-400 mt-2">GPU 服务器性能综合评测系统</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowScript(!showScript)}
              variant="secondary"
              size="sm"
              className="bg-slate-800 hover:bg-slate-700"
            >
              <Code className="h-4 w-4 mr-2" />
              {showScript ? '隐藏脚本' : '查看脚本'}
            </Button>
            <Button onClick={loadServers} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新服务器
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧面板：服务器选择和测试配置 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 服务器选择 */}
            <Card className="border-white/[0.1] bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">服务器选择</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="server" className="text-sm font-medium text-slate-300">选择服务器</label>
                  <select 
                    id="server" 
                    className="w-full rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all duration-200"
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
              <Card className="border-white/[0.1] bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white">测试配置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs value={selectedTest} onValueChange={setSelectedTest} className="w-full">
                    <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 bg-slate-800/50">
                      {testTypes.map(test => (
                        <TabsTrigger 
                          key={test.value} 
                          value={test.value} 
                          className="flex items-center gap-2 text-sm py-2 px-3 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400"
                        >
                          {test.icon}
                          <span className="hidden sm:inline">{test.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <TabsContent value="env_check" className="pt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <p className="text-sm text-slate-300">{testTypes.find(t => t.value === 'env_check')?.description}</p>
                        </div>
                        {showScript && (
                          <div className="mt-4 p-4 bg-slate-950/80 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium text-slate-300">测试脚本</span>
                            </div>
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto p-4 bg-slate-900/80 rounded-lg border border-slate-700/50 shadow-inner">
                              {getTestScript('env_check')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="gemm" className="pt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <p className="text-sm text-slate-300">{testTypes.find(t => t.value === 'gemm')?.description}</p>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="matrixSize" className="text-sm font-medium text-slate-300">矩阵尺寸</label>
                          <input
                            id="matrixSize"
                            type="number"
                            value={matrixSize}
                            onChange={(e) => setMatrixSize(Number(e.target.value))}
                            min={1024}
                            max={16384}
                            step={1024}
                            className="w-40 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all duration-200"
                          />
                        </div>
                        {showScript && (
                          <div className="mt-4 p-4 bg-slate-950/80 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium text-slate-300">测试脚本</span>
                            </div>
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto p-4 bg-slate-900/80 rounded-lg border border-slate-700/50 shadow-inner">
                              {getTestScript('gemm')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="memory_bandwidth" className="pt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <p className="text-sm text-slate-300">{testTypes.find(t => t.value === 'memory_bandwidth')?.description}</p>
                        </div>
                        {showScript && (
                          <div className="mt-4 p-4 bg-slate-950/80 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium text-slate-300">测试脚本</span>
                            </div>
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto p-4 bg-slate-900/80 rounded-lg border border-slate-700/50 shadow-inner">
                              {getTestScript('memory_bandwidth')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="disk_io" className="pt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <p className="text-sm text-slate-300">{testTypes.find(t => t.value === 'disk_io')?.description}</p>
                        </div>
                        {showScript && (
                          <div className="mt-4 p-4 bg-slate-950/80 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium text-slate-300">测试脚本</span>
                            </div>
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto p-4 bg-slate-900/80 rounded-lg border border-slate-700/50 shadow-inner">
                              {getTestScript('disk_io')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="gpu_topology" className="pt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <p className="text-sm text-slate-300">{testTypes.find(t => t.value === 'gpu_topology')?.description}</p>
                        </div>
                        {showScript && (
                          <div className="mt-4 p-4 bg-slate-950/80 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium text-slate-300">测试脚本</span>
                            </div>
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto p-4 bg-slate-900/80 rounded-lg border border-slate-700/50 shadow-inner">
                              {getTestScript('gpu_topology')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="nccl" className="pt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <p className="text-sm text-slate-300">{testTypes.find(t => t.value === 'nccl')?.description}</p>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="testType" className="text-sm font-medium text-slate-300">测试类型</label>
                          <select 
                            id="testType"
                            className="w-full rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all duration-200"
                            value={testType}
                            onChange={(e) => setTestType(e.target.value)}
                          >
                            <option value="">选择测试类型</option>
                            <option value="all_reduce">AllReduce</option>
                            <option value="all_gather">AllGather</option>
                            <option value="broadcast">Broadcast</option>
                          </select>
                        </div>
                        {showScript && (
                          <div className="mt-4 p-4 bg-slate-950/80 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium text-slate-300">测试脚本</span>
                            </div>
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto p-4 bg-slate-900/80 rounded-lg border border-slate-700/50 shadow-inner">
                              {getTestScript('nccl')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="gpu_burn" className="pt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <p className="text-sm text-slate-300">{testTypes.find(t => t.value === 'gpu_burn')?.description}</p>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="duration" className="text-sm font-medium text-slate-300">测试时长 (秒)</label>
                          <input
                            id="duration"
                            type="number"
                            value={testDuration}
                            onChange={(e) => setTestDuration(Number(e.target.value))}
                            min={60}
                            max={3600}
                            step={60}
                            className="w-40 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 ring-offset-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all duration-200"
                          />
                        </div>
                        {showScript && (
                          <div className="mt-4 p-4 bg-slate-950/80 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium text-slate-300">测试脚本</span>
                            </div>
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto p-4 bg-slate-900/80 rounded-lg border border-slate-700/50 shadow-inner">
                              {getTestScript('gpu_burn')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="inference" className="pt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <p className="text-sm text-slate-300">{testTypes.find(t => t.value === 'inference')?.description}</p>
                        </div>
                        {showScript && (
                          <div className="mt-4 p-4 bg-slate-950/80 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium text-slate-300">测试脚本</span>
                            </div>
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto p-4 bg-slate-900/80 rounded-lg border border-slate-700/50 shadow-inner">
                              {getTestScript('inference')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* 错误和成功提示 */}
                  {error && (
                    <div className="mt-4 p-4 bg-red-400/10 border border-red-400/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-medium">错误</span>
                        <span className="text-slate-300">{error}</span>
                      </div>
                    </div>
                  )}
                  {success && (
                    <div className="mt-4 p-4 bg-cyan-400/10 border border-cyan-400/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-medium">成功</span>
                        <span className="text-slate-300">{success}</span>
                      </div>
                    </div>
                  )}

                  {/* 执行按钮 */}
                  <div className="flex gap-4 mt-6 flex-wrap">
                    <Button onClick={runTest} disabled={isRunning} className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500">
                      {isRunning ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      执行测试
                    </Button>
                    <Button onClick={runAllTests} disabled={isRunning} variant="secondary" className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700">
                      <Layers className="h-4 w-4 mr-2" />
                      全部测试
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧面板：测试结果 */}
          <div className="lg:col-span-1">
            {selectedServer && (
              <Card className="border-white/[0.1] bg-slate-900/50 backdrop-blur-sm h-full">
                <CardHeader className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white">测试结果</CardTitle>
                  <button 
                    onClick={loadTestResults}
                    disabled={isRefreshing}
                    className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                    title="刷新结果"
                  >
                    {isRefreshing ? (
                      <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </CardHeader>
                <CardContent className="h-[calc(100vh-300px)] overflow-y-auto">
                  {testResults.length === 0 ? (
                    <div className="py-16 text-center">
                      <Server className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                      <p className="text-slate-500">暂无测试结果</p>
                      <p className="text-xs text-slate-600 mt-2">选择服务器并执行测试后查看结果</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {testResults.slice(0, 10).map(result => {
                        const testData = parseTestResult(result.testResult)
                        const config = parseTestConfig(result.testConfig)
                        const isExpanded = expandedResult === result.id
                        
                        return (
                          <div key={result.id} className="border border-white/[0.08] rounded-lg overflow-hidden bg-slate-900/30 hover:bg-slate-900/50 transition-all duration-200">
                            <div 
                              className="flex items-center justify-between p-4 cursor-pointer"
                              onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/[0.05]">
                                  {testTypes.find(t => t.value === result.testType)?.icon}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-white">{getTestTypeLabel(result.testType)}</span>
                                    {result.status === 'RUNNING' && <span className="px-2 py-1 text-xs rounded-full bg-blue-400/20 text-blue-400">运行中</span>}
                                    {result.status === 'COMPLETED' && <span className="px-2 py-1 text-xs rounded-full bg-emerald-400/20 text-emerald-400">已完成</span>}
                                    {result.status === 'FAILED' && <span className="px-2 py-1 text-xs rounded-full bg-red-400/20 text-red-400">失败</span>}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs text-slate-400">
                                      <Clock className="h-3 w-3 inline mr-1" />
                                      {new Date(result.startedAt).toLocaleString()}
                                    </span>
                                    {result.durationSeconds && (
                                      <span className="text-xs text-slate-400">
                                        时长: {result.durationSeconds.toFixed(1)}s
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors">
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                              </button>
                            </div>
                            
                            {isExpanded && (
                              <div className="p-4 border-t border-white/[0.08] bg-slate-950/50">
                                {result.status === 'FAILED' ? (
                                  <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                                    <div className="text-sm font-medium text-red-400 mb-1">错误信息</div>
                                    <div className="text-xs text-slate-300">{result.errorMessage}</div>
                                  </div>
                                ) : result.status === 'COMPLETED' ? (
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-sm font-medium text-slate-300 mb-2">测试结果</div>
                                      <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                          {JSON.stringify(testData, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                    {Object.keys(config).length > 0 && (
                                      <div>
                                        <div className="text-sm font-medium text-slate-300 mb-2">测试配置</div>
                                        <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                                          <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                                            {JSON.stringify(config, null, 2)}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3 bg-blue-400/10 border border-blue-400/20 rounded-lg">
                                    <div className="text-sm font-medium text-blue-400 mb-1">测试中</div>
                                    <div className="text-xs text-slate-300">测试正在执行，请稍候...</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      )}
                      {testResults.length > 10 && (
                        <div className="text-center py-4">
                          <p className="text-xs text-slate-500">显示前 10 条结果，共 {testResults.length} 条</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
