import { Service, CheckResult, insertResult } from '../db'
import { checkLlm, LlmConfig } from './llm'
import { checkEmbedding, EmbeddingConfig } from './embedding'
import { checkHttp, HttpConfig } from './http'

export async function runCheck(service: Service): Promise<CheckResult> {
  const config = JSON.parse(service.config)
  let result

  if (service.type === 'llm') {
    result = await checkLlm(config as LlmConfig)
  } else if (service.type === 'embedding') {
    result = await checkEmbedding(config as EmbeddingConfig)
  } else {
    result = await checkHttp(config as HttpConfig)
  }

  return insertResult({
    service_id: service.id,
    status: result.status,
    latency_ms: result.latency_ms,
    message: result.message,
  })
}
