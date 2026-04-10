import { CheckStatus } from '../db'
import { CheckerResult } from './llm'

const DEGRADED_THRESHOLD_MS = parseInt(process.env.DEGRADED_THRESHOLD_MS ?? '3000', 10)

export interface EmbeddingConfig {
  url: string
  model: string
  api_key: string
  input: string
  timeout_ms?: number
}

export async function checkEmbedding(config: EmbeddingConfig): Promise<CheckerResult> {
  const timeout = config.timeout_ms ?? 10000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const start = Date.now()

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: config.input,
      }),
      signal: controller.signal,
    })
    const latency_ms = Date.now() - start
    clearTimeout(timer)

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText)
      return { status: 'down', latency_ms, message: `HTTP ${response.status}: ${text.slice(0, 200)}` }
    }

    const data = await response.json()
    const embedding: number[] | undefined = data?.data?.[0]?.embedding

    if (!Array.isArray(embedding)) {
      return { status: 'down', latency_ms, message: 'Invalid response: missing data[0].embedding array' }
    }

    const status: CheckStatus = latency_ms > DEGRADED_THRESHOLD_MS ? 'degraded' : 'ok'
    return { status, latency_ms, message: `embedding size: ${embedding.length}` }
  } catch (err) {
    clearTimeout(timer)
    const latency_ms = Date.now() - start
    const message = err instanceof Error
      ? (err.name === 'AbortError' ? 'timeout' : err.message)
      : 'unknown error'
    return { status: 'down', latency_ms: err instanceof Error && err.name === 'AbortError' ? null : latency_ms, message }
  }
}
