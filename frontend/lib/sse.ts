/**
 * SSE (Server-Sent Events) client for real-time updates
 */
export interface SseEvent {
  type: string
  data: any
  timestamp: string
}

export class SseClient {
  private eventSource: EventSource | null = null
  private url: string
  private listeners: Map<string, ((event: SseEvent) => void)[]> = new Map()

  constructor(url: string) {
    this.url = url
  }

  /**
   * Connect to SSE stream
   */
  connect(lastEventId?: string) {
    if (this.eventSource) {
      this.close()
    }

    const url = lastEventId ? `${this.url}?lastEventId=${lastEventId}` : this.url
    this.eventSource = new EventSource(url)

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected')
      this.emit('connected', { type: 'connected', data: null, timestamp: new Date().toISOString() })
    }

    this.eventSource.onmessage = (event) => {
      console.log('[SSE] Message', event.data)
      const data = JSON.parse(event.data)
      this.emit('message', { type: 'message', data, timestamp: new Date().toISOString() })
    }

    this.eventSource.onerror = (error) => {
      console.error('[SSE] Error', error)
      this.emit('error', { type: 'error', data: { error: 'SSE connection error' }, timestamp: new Date().toISOString() })
    }

    // Custom event listeners
    this.eventSource.addEventListener('provision-progress', (event) => {
      const data = JSON.parse(event.data)
      this.emit('provision-progress', { type: 'provision-progress', data, timestamp: new Date().toISOString() })
    })

    this.eventSource.addEventListener('error', (event: MessageEvent) => {
      const data = JSON.parse(event.data)
      this.emit('error', { type: 'error', data, timestamp: new Date().toISOString() })
    })

    this.eventSource.addEventListener('completed', (event: MessageEvent) => {
      const data = JSON.parse(event.data)
      this.emit('completed', { type: 'completed', data, timestamp: new Date().toISOString() })
    })
  }

  /**
   * Close SSE connection
   */
  close() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  /**
   * Subscribe to events
   */
  on(eventType: string, callback: (event: SseEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)?.push(callback)
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, callback: (event: SseEvent) => void) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      this.listeners.set(
        eventType,
        callbacks.filter((cb) => cb !== callback)
      )
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(eventType: string, event: SseEvent) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      callbacks.forEach((callback) => callback(event))
    }
  }

  /**
   * Subscribe to provision progress events
   */
  onProvisionProgress(callback: (data: any) => void) {
    this.on('provision-progress', (event) => callback(event.data))
  }

  /**
   * Subscribe to completion events
   */
  onCompleted(callback: (data: { success: boolean; message?: string }) => void) {
    this.on('completed', (event) => callback(event.data))
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (data: { error: string }) => void) {
    this.on('error', (event) => callback(event.data))
  }
}
