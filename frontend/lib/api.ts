/**
 * API client for HyperNode-Provisioner
 */
import axios, { AxiosInstance, AxiosError } from 'axios'

export class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string, timeout: number = 30000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        console.error('[API] Error', error.response?.status, error.message)
        return Promise.reject(error)
      }
    )
  }

  private async get<T = any>(url: string, config?: any): Promise<T> {
    return this.client.get(url, config) as any
  }

  private async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return this.client.post(url, data, config) as any
  }

  private async put<T = any>(url: string, data?: any): Promise<T> {
    return this.client.put(url, data) as any
  }

  private async patch<T = any>(url: string, data?: any): Promise<T> {
    return this.client.patch(url, data) as any
  }

  private async del<T = any>(url: string): Promise<T> {
    return this.client.delete(url) as any
  }

  // DataCenter API
  async getDataCenters(): Promise<any[]> {
    return this.get('/datacenters')
  }

  async getDataCenter(id: string): Promise<any> {
    return this.get(`/datacenters/${id}`)
  }

  async createDataCenter(data: any): Promise<any> {
    return this.post('/datacenters', data)
  }

  async updateDataCenter(id: string, data: any): Promise<any> {
    return this.put(`/datacenters/${id}`, data)
  }

  async deleteDataCenter(id: string): Promise<any> {
    return this.del(`/datacenters/${id}`)
  }

  // Server API
  async getServers(datacenterId?: string): Promise<any[]> {
    const params = datacenterId ? { datacenterId } : {}
    return this.get('/servers', { params })
  }

  async getServer(id: string): Promise<any> {
    return this.get(`/servers/${id}`)
  }

  async getServerByIp(ipAddress: string): Promise<any> {
    return this.get(`/servers/ip/${ipAddress}`)
  }

  async createServer(data: any): Promise<any> {
    return this.post('/servers', data)
  }

  async updateServer(id: string, data: any): Promise<any> {
    return this.put(`/servers/${id}`, data)
  }

  async updateServerStatus(id: string, status: string): Promise<any> {
    return this.patch(`/servers/${id}/status`, { status })
  }

  async deleteServer(id: string): Promise<any> {
    return this.del(`/servers/${id}`)
  }

  async rotateServerPrivateKey(id: string, privateKey: string): Promise<any> {
    return this.patch(`/servers/${id}/ssh-private-key`, { privateKey })
  }

  async testServerConnection(id: string): Promise<any> {
    return this.post(`/servers/${id}/test-connection`)
  }

  async testConnectionPreCreate(data: { ipAddress: string; sshPort: number; username: string; privateKey?: string; sshKeyProfileId?: string }): Promise<any> {
    return this.post('/servers/test-connection', data)
  }

  async getServerSpecs(id: string): Promise<any> {
    return this.get(`/servers/${id}/specs`)
  }

  // ConfigTemplate API
  async getTemplates(datacenterId?: string): Promise<any[]> {
    const params = datacenterId ? { datacenterId } : {}
    return this.get('/templates', { params })
  }

  async getTemplate(id: string): Promise<any> {
    return this.get(`/templates/${id}`)
  }

  async createTemplate(data: any): Promise<any> {
    return this.post('/templates', data)
  }

  async updateTemplate(id: string, data: any): Promise<any> {
    return this.put(`/templates/${id}`, data)
  }

  async deleteTemplate(id: string): Promise<any> {
    return this.del(`/templates/${id}`)
  }

  // Task API
  async getTasks(): Promise<any[]> {
    return this.get('/tasks')
  }

  async getTask(id: string): Promise<any> {
    return this.get(`/tasks/${id}`)
  }

  async getTasksByServer(serverId: string): Promise<any[]> {
    return this.get(`/tasks/server/${serverId}`)
  }

  async getTaskProgress(taskId: string): Promise<any> {
    return this.get(`/tasks/${taskId}/progress`)
  }

  async createTask(data: any): Promise<any> {
    return this.post('/tasks', data)
  }

  async updateTaskProgress(taskId: string, payload: { currentStep?: number; totalSteps?: number; [k: string]: unknown }): Promise<any> {
    return this.patch(`/tasks/${taskId}/progress`, payload)
  }

  async setTaskForceRun(taskId: string, forceRun = true, userId?: string): Promise<any> {
    return this.patch(`/tasks/${taskId}/force-run`, { forceRun, userId })
  }

  // Provision API
  async startProvision(serverId: string, templateId?: string): Promise<any> {
    const params = templateId ? { templateId } : {}
    return this.post(`/provision/${serverId}/start`, null, { params })
  }

  async rollbackProvision(serverId: string): Promise<any> {
    return this.post(`/provision/${serverId}/rollback`)
  }

  // Task execution
  async executeTask(taskId: string, serverId: string, playbookPath?: string): Promise<any> {
    return this.post(`/tasks/${taskId}/execute`, { serverId, playbookPath })
  }

  async rollbackTask(taskId: string, serverId: string, playbookPath?: string): Promise<any> {
    return this.post(`/tasks/${taskId}/rollback`, { serverId, playbookPath })
  }

  // Benchmark API
  async startGpuBurn(serverId: string, duration: number = 300): Promise<any> {
    return this.post('/benchmark/start-gpu-burn', { serverId, duration: String(duration) })
  }

  async getGpuBurnResults(serverId: string): Promise<any> {
    return this.get(`/benchmark/gpu-burn-results/${serverId}`)
  }

  async startNcclTest(serverId: string, testType: string = 'all_reduce'): Promise<any> {
    return this.post('/benchmark/start-nccl', { serverId, testType })
  }

  async getNcclResults(serverId: string): Promise<any> {
    return this.get(`/benchmark/nccl-results/${serverId}`)
  }

  async getDcgmData(serverId: string): Promise<any> {
    return this.get(`/benchmark/dcgm-data/${serverId}`)
  }

  async getPerformanceReport(serverId: string): Promise<any> {
    return this.get(`/benchmark/report/${serverId}`)
  }

  // Audit API
  async getAuditLogs(params: { action?: string; targetId?: string; page?: number; size?: number } = {}): Promise<any> {
    return this.get('/audit/logs', { params })
  }

  // SSH Key Profile API
  async getSshKeyProfiles(): Promise<any[]> {
    return this.get('/ssh-keys')
  }

  async getSshKeyProfile(id: string): Promise<any> {
    return this.get(`/ssh-keys/${id}`)
  }

  async createSshKeyProfile(data: { name: string; username: string; privateKey: string; description?: string }): Promise<any> {
    return this.post('/ssh-keys', data)
  }

  async updateSshKeyProfile(id: string, data: { name: string; username: string; privateKey?: string; description?: string }): Promise<any> {
    return this.put(`/ssh-keys/${id}`, data)
  }

  async deleteSshKeyProfile(id: string): Promise<any> {
    return this.del(`/ssh-keys/${id}`)
  }

  // Server batch creation
  async batchCreateServers(data: { sshKeyProfileId: string; dataCenterId?: string; gpuTopology?: string; nodes: { ipAddress: string; sshPort?: number; username?: string }[] }): Promise<any> {
    return this.post('/servers/batch', data)
  }

  // Dashboard API
  async getDashboardStats(): Promise<any> {
    return this.get('/dashboard/stats')
  }

  async getDashboardHealth(): Promise<any> {
    return this.get('/dashboard/health')
  }
}

export const apiClient = new ApiClient('http://localhost:8080/api/v1')
