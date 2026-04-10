import { CheckStatus } from '../db'
import { CheckerResult } from './llm'

const DEGRADED_THRESHOLD_MS = parseInt(process.env.DEGRADED_THRESHOLD_MS ?? '3000', 10)

export interface HttpConfig {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
  expected_status?: number
  timeout_ms?: number
}

export async function checkHttp(config: HttpConfig): Promise<CheckerResult> {
  const timeout = config.timeout_ms ?? 10000
  const expectedStatus = config.expected_status ?? 200
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const start = Date.now()

  try {
    const response = await fetch(config.url, {
      method: config.method ?? 'GET',
      headers: config.headers,
      body: config.body,
      signal: controller.signal,
    })
    const latency_ms = Date.now() - start
    clearTimeout(timer)

    if (response.status !== expectedStatus) {
      return {
        status: 'down',
        latency_ms,
        message: `Expected HTTP ${expectedStatus}, got ${response.status}`,
      }
    }

    const status: CheckStatus = latency_ms > DEGRADED_THRESHOLD_MS ? 'degraded' : 'ok'
    return { status, latency_ms, message: `HTTP ${response.status}` }
  } catch (err) {
    clearTimeout(timer)
    const latency_ms = Date.now() - start
    const message = err instanceof Error
      ? (err.name === 'AbortError' ? 'timeout' : err.message)
      : 'unknown error'
    return { status: 'down', latency_ms: err instanceof Error && err.name === 'AbortError' ? null : latency_ms, message }
  }
}
