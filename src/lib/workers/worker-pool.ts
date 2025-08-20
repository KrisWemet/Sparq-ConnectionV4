import { Worker } from 'worker_threads'
import { join } from 'path'
import { AgentType, WorkerTask, WorkerResult, AgentInput, AgentOutput } from '../orchestration/types'

export interface WorkerPoolConfig {
  minWorkers: number
  maxWorkers: number
  idleTimeout: number
  taskTimeout: number
}

export class WorkerPool {
  private workers: Map<string, PoolWorker> = new Map()
  private taskQueue: WorkerTask[] = []
  private activeWorkers = 0
  private config: WorkerPoolConfig

  constructor(config: WorkerPoolConfig) {
    this.config = config
    this.initializeMinWorkers()
  }

  async execute(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out`))
      }, task.timeout || this.config.taskTimeout)

      const wrappedTask = {
        ...task,
        resolve: (result: WorkerResult) => {
          clearTimeout(timeoutId)
          resolve(result)
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId)
          reject(error)
        }
      }

      this.addTask(wrappedTask)
    })
  }

  private async addTask(task: any) {
    // Try to find an available worker
    const availableWorker = this.findAvailableWorker()
    
    if (availableWorker) {
      this.assignTaskToWorker(availableWorker, task)
    } else if (this.activeWorkers < this.config.maxWorkers) {
      // Create new worker if under limit
      const newWorker = await this.createWorker()
      this.assignTaskToWorker(newWorker, task)
    } else {
      // Queue the task if no workers available
      this.taskQueue.push(task)
      this.taskQueue.sort((a, b) => b.priority - a.priority) // Higher priority first
    }
  }

  private findAvailableWorker(): PoolWorker | null {
    for (const worker of this.workers.values()) {
      if (!worker.busy) {
        return worker
      }
    }
    return null
  }

  private async createWorker(): Promise<PoolWorker> {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const workerPath = join(__dirname, 'agent-worker.js')
    
    const worker = new Worker(workerPath, {
      workerData: { workerId }
    })

    const poolWorker: PoolWorker = {
      id: workerId,
      worker,
      busy: false,
      lastUsed: Date.now(),
      currentTask: null
    }

    worker.on('message', (result: WorkerResult) => {
      this.handleWorkerResult(poolWorker, result)
    })

    worker.on('error', (error) => {
      this.handleWorkerError(poolWorker, error)
    })

    worker.on('exit', (code) => {
      this.handleWorkerExit(poolWorker, code)
    })

    this.workers.set(workerId, poolWorker)
    this.activeWorkers++

    return poolWorker
  }

  private assignTaskToWorker(worker: PoolWorker, task: any) {
    worker.busy = true
    worker.currentTask = task
    worker.lastUsed = Date.now()

    worker.worker.postMessage({
      type: 'execute',
      task: {
        id: task.id,
        agentType: task.agentType,
        input: task.input,
        priority: task.priority
      }
    })
  }

  private handleWorkerResult(worker: PoolWorker, result: WorkerResult) {
    const task = worker.currentTask
    if (task && task.resolve) {
      task.resolve(result)
    }

    worker.busy = false
    worker.currentTask = null
    worker.lastUsed = Date.now()

    // Process next task in queue if available
    this.processNextTask()
  }

  private handleWorkerError(worker: PoolWorker, error: Error) {
    const task = worker.currentTask
    if (task && task.reject) {
      task.reject(error)
    }

    // Reset worker state
    worker.busy = false
    worker.currentTask = null

    // Process next task
    this.processNextTask()
  }

  private handleWorkerExit(worker: PoolWorker, code: number) {
    this.workers.delete(worker.id)
    this.activeWorkers--

    if (code !== 0) {
      console.error(`Worker ${worker.id} exited with code ${code}`)
      
      // If worker died with a task, reject it
      if (worker.currentTask && worker.currentTask.reject) {
        worker.currentTask.reject(new Error(`Worker died with code ${code}`))
      }
    }

    // Ensure minimum workers
    if (this.activeWorkers < this.config.minWorkers) {
      this.createWorker()
    }
  }

  private processNextTask() {
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift()
      if (nextTask) {
        this.addTask(nextTask)
      }
    }
  }

  private initializeMinWorkers() {
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.createWorker()
    }
  }

  async shutdown() {
    // Gracefully shutdown all workers
    for (const [workerId, worker] of this.workers) {
      worker.worker.postMessage({ type: 'shutdown' })
      await worker.worker.terminate()
    }
    
    this.workers.clear()
    this.activeWorkers = 0
    this.taskQueue = []
  }

  getStats() {
    return {
      totalWorkers: this.activeWorkers,
      busyWorkers: Array.from(this.workers.values()).filter(w => w.busy).length,
      queuedTasks: this.taskQueue.length,
      config: this.config
    }
  }

  // Cleanup idle workers
  private cleanupIdleWorkers() {
    const now = Date.now()
    const workersToRemove: string[] = []

    for (const [workerId, worker] of this.workers) {
      if (!worker.busy && 
          (now - worker.lastUsed) > this.config.idleTimeout &&
          this.activeWorkers > this.config.minWorkers) {
        workersToRemove.push(workerId)
      }
    }

    workersToRemove.forEach(workerId => {
      const worker = this.workers.get(workerId)
      if (worker) {
        worker.worker.terminate()
        this.workers.delete(workerId)
        this.activeWorkers--
      }
    })
  }

  startCleanupTimer() {
    setInterval(() => {
      this.cleanupIdleWorkers()
    }, this.config.idleTimeout / 2) // Check every half idle timeout
  }
}

interface PoolWorker {
  id: string
  worker: Worker
  busy: boolean
  lastUsed: number
  currentTask: any
}