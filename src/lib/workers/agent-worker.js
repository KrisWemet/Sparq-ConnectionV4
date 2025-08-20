const { parentPort, workerData } = require('worker_threads')

// Import agent implementations
const { StandardSafetyAgent } = require('../agents/safety-agent')
const { StandardPsychologyAgent } = require('../agents/psychology-agent') 
const { StandardComplianceAgent } = require('../agents/compliance-agent')
const { StandardTechnicalAgent } = require('../agents/technical-agent')

class AgentWorker {
  constructor(workerId) {
    this.workerId = workerId
    this.agents = new Map()
    this.initializeAgents()
  }

  initializeAgents() {
    try {
      this.agents.set('safety', new StandardSafetyAgent())
      this.agents.set('psychology', new StandardPsychologyAgent())
      this.agents.set('compliance', new StandardComplianceAgent())
      this.agents.set('technical', new StandardTechnicalAgent())
    } catch (error) {
      this.sendError('Failed to initialize agents', error)
    }
  }

  async executeTask(task) {
    const startTime = Date.now()
    
    try {
      const agent = this.agents.get(task.agentType)
      if (!agent) {
        throw new Error(`Unknown agent type: ${task.agentType}`)
      }

      // Validate input
      if (agent.validate && !agent.validate(task.input)) {
        throw new Error(`Invalid input for ${task.agentType} agent`)
      }

      // Execute the agent
      const result = await agent.process(task.input)
      
      // Send result back to main thread
      this.sendResult({
        taskId: task.id,
        agentType: task.agentType,
        output: result,
        duration: Date.now() - startTime
      })

    } catch (error) {
      this.sendResult({
        taskId: task.id,
        agentType: task.agentType,
        output: null,
        duration: Date.now() - startTime,
        error: {
          message: error.message,
          stack: error.stack
        }
      })
    }
  }

  sendResult(result) {
    if (parentPort) {
      parentPort.postMessage(result)
    }
  }

  sendError(message, error) {
    if (parentPort) {
      parentPort.postMessage({
        type: 'error',
        workerId: this.workerId,
        message,
        error: {
          message: error?.message || 'Unknown error',
          stack: error?.stack
        }
      })
    }
  }
}

// Initialize worker
const worker = new AgentWorker(workerData.workerId)

// Listen for messages from main thread
if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      switch (message.type) {
        case 'execute':
          await worker.executeTask(message.task)
          break
          
        case 'shutdown':
          // Graceful shutdown
          process.exit(0)
          break
          
        default:
          worker.sendError('Unknown message type', new Error(`Unknown type: ${message.type}`))
      }
    } catch (error) {
      worker.sendError('Message handling failed', error)
    }
  })

  parentPort.on('error', (error) => {
    worker.sendError('Parent port error', error)
  })
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  worker.sendError('Uncaught exception', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  worker.sendError('Unhandled rejection', new Error(`Unhandled promise rejection: ${reason}`))
})