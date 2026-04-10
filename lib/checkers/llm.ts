import { CheckStatus } from '../db'

const DEGRADED_THRESHOLD_MS = parseInt(process.env.DEGRADED_THRESHOLD_MS ?? '3000', 10)

export interface LlmConfig {
  url: string
  model: string
  api_key: string
  prompt: string
  timeout_ms?: number
}

export interface CheckerResult {
  status: CheckStatus
  latency_ms: number | null
  message: string | null
}

export async function checkLlm(config: LlmConfig): Promise<CheckerResult> {
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
        messages: [{ role: 'user', content: config.prompt }],
        max_tokens: 50,
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
    // Some models (e.g. Qwen3 thinking mode) return content as null/empty
    // and put the actual reply in reasoning_content instead
    const content: string | undefined =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.message?.reasoning_content

    if (!content) {
      const raw = JSON.stringify(data?.choices?.[0]?.message ?? data).slice(0, 200)
      return { status: 'down', latency_ms, message: `Unexpected response shape: ${raw}` }
    }

    const status: CheckStatus = latency_ms > DEGRADED_THRESHOLD_MS ? 'degraded' : 'ok'
    return { status, latency_ms, message: content.slice(0, 100) }
  } catch (err) {
    clearTimeout(timer)
    const latency_ms = Date.now() - start
    const message = err instanceof Error
      ? (err.name === 'AbortError' ? 'timeout' : err.message)
      : 'unknown error'
    return { status: 'down', latency_ms: err instanceof Error && err.name === 'AbortError' ? null : latency_ms, message }
  }
}
