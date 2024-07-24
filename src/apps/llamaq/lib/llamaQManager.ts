import { env } from '@/env'
import { Queue, Worker, type Job } from 'bullmq'
import IORedis, { type RedisOptions } from 'ioredis'

const logToConsole = env.DEBUG === 'true'

class LlamaQManager {
  private readonly targetUrl: string
  private readonly queues = new Map<string, Queue>()
  private readonly connection: IORedis

  static handler() {
    return
  }

  constructor(
    targetUrl: string,
    redisUrl: string,
    redisOptions?: RedisOptions,
  ) {
    this.targetUrl = targetUrl
    redisOptions = redisOptions ?? { maxRetriesPerRequest: null }
    this.connection = new IORedis(redisUrl, redisOptions)
  }

  enqueue = async (name: string, action: string, payload: unknown) => {
    const queue = this.getOrCreateQueue(name)
    await queue.add(action, payload)
    if (logToConsole) {
      console.log(`Enqueued job ${action} to queue ${name}`)
      console.log('Payload:', payload)
    }
    return queue
  }

  bootstrap = async () => {
    const queues = await this.listJobsAndExtractQueues()
    return queues.map((queueName) => {
      return this.createQueue(queueName)
    })
  }

  private getOrCreateQueue = (name: string) => {
    const queue = this.queues.get(name)

    if (!queue) {
      return this.createQueue(name)
    }

    return queue
  }

  private createQueue = (name: string) => {
    if (this.queues.has(name)) {
      throw new Error(`Queue ${name} already exists`)
    }
    const queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
      },
    })
    this.queues.set(name, queue)

    new Worker(name, this.processor, {
      connection: this.connection,
      concurrency: 10,
    })

    if (logToConsole) {
      console.log(`Created queue ${name}`)
    }

    return queue
  }

  private processor = async (job: Job<unknown, unknown, string>) => {
    const body = JSON.stringify({
      jobId: job.id,
      jobAttemptNumber: job.attemptsStarted,
      queue: job.queueName,
      action: job.name,
      payload: job.data,
    })
    if (logToConsole) {
      console.log(`Processing job ${job.id} in queue ${job.queueName}`)
      console.log('Payload:', job.data)
    }

    try {
      const res = await fetch(this.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.NEXTJS_API_ACCESS_KEY}`,
        },
        body,
      })

      const text = await res.text()

      if (!res.ok) {
        throw new Error(
          `Remote failed to process event. Remote response: ${res.status} ${res.statusText}. Response: ${text}`,
        )
      }

      try {
        return JSON.parse(text)
      } catch (error) {
        return text
      }
    } catch (_error) {
      const error = _error as FetchError

      if (error.cause && error.cause.code === 'ECONNREFUSED') {
        throw new Error('Connection to LlamaQ service has been refused')
      } else if (error.cause && error.cause.code === 'ENOTFOUND') {
        throw new Error(
          'The service url has not been found. url: ' + this.targetUrl,
        )
      }
      throw error
    }
  }

  private listJobsAndExtractQueues = async () => {
    const keys = await this.connection.keys('bull:*')
    const queueNames = new Set()

    for (const key of keys) {
      const match = key.match(/^(.*):id/)
      if (match) {
        queueNames.add(match[1]?.replace('bull:', ''))
      }
    }

    return Array.from(queueNames) as string[]
  }
}

export const llamaQManager = new LlamaQManager(
  env.NEXTJS_PROCESSOR_URL,
  env.REDIS_URL,
)
