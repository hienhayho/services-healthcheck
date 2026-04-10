import { AlertChannel, CheckResult, Service } from './db'

function formatLatency(latency_ms: number | null): string {
  if (latency_ms === null) return 'timeout'
  if (latency_ms < 1000) return `${latency_ms}ms`
  return `${(latency_ms / 1000).toFixed(1)}s`
}

function statusIcon(status: string): string {
  if (status === 'ok') return '✅'
  if (status === 'degraded') return '⚠️'
  return '❌'
}

function typeLabel(type: string): string {
  if (type === 'llm') return 'LLM'
  if (type === 'embedding') return 'Embedding'
  return 'HTTP'
}

function statusLine(status: string, latency_ms: number | null): string {
  const icon = status === 'ok' ? '✅' : status === 'degraded' ? '⚠️' : '❌'
  const label = status.toUpperCase()
  const lat = latency_ms === null ? 'timeout' : latency_ms < 1000 ? `${latency_ms}ms` : `${(latency_ms / 1000).toFixed(1)}s`
  return `${icon} <b>${label}</b>  <code>${lat}</code>`
}

export function formatReport(results: CheckResult[], services: Service[]): string {
  const serviceMap = new Map(services.map(s => [s.id, s]))
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const okCount = results.filter(r => r.status === 'ok').length
  const downCount = results.filter(r => r.status === 'down').length
  const degradedCount = results.filter(r => r.status === 'degraded').length
  const allOk = downCount === 0 && degradedCount === 0

  const summary = [
    downCount > 0 ? `❌ ${downCount} down` : null,
    degradedCount > 0 ? `⚠️ ${degradedCount} degraded` : null,
    okCount > 0 ? `✅ ${okCount} healthy` : null,
  ].filter(Boolean).join('  ·  ')

  const header = `${summary}  ·  🕐 <code>${now} UTC</code>`

  if (allOk) {
    // Compact: one line per service, no dividers
    const lines = results.map(r => {
      const name = serviceMap.get(r.service_id)?.name ?? `#${r.service_id}`
      const lat = formatLatency(r.latency_ms)
      return `✅ <b>${name}</b>  <code>${lat}</code>`
    })
    return `${header}\n\n${lines.join('\n')}`
  }

  // Has issues: compact OK lines at top, full cards only for non-OK
  const okLines = results
    .filter(r => r.status === 'ok')
    .map(r => {
      const name = serviceMap.get(r.service_id)?.name ?? `#${r.service_id}`
      return `✅ <b>${name}</b>  <code>${formatLatency(r.latency_ms)}</code>`
    })

  const divider = '┄'.repeat(28)
  const issueCards = results
    .filter(r => r.status !== 'ok')
    .map(r => {
      const svc = serviceMap.get(r.service_id)
      const name = svc?.name ?? `#${r.service_id}`
      const type = typeLabel(svc?.type ?? '')
      const icon = r.status === 'degraded' ? '⚠️' : '❌'
      const label = r.status.toUpperCase()
      const lat = formatLatency(r.latency_ms)
      const errorLine = r.message
        ? `\n<code>  ${r.message.slice(0, 120)}</code>`
        : ''
      return `${icon} <b>${name}</b>  <i>${type}</i>\n<b>${label}</b>  <code>${lat}</code>${errorLine}`
    })

  const parts: string[] = [header]
  if (okLines.length > 0) parts.push(okLines.join('\n'))
  if (issueCards.length > 0) parts.push(`${divider}\n${issueCards.join(`\n${divider}\n`)}\n${divider}`)

  return parts.join('\n\n')
}

export async function sendReport(
  results: CheckResult[],
  services: Service[],
  channels: AlertChannel[]
): Promise<void> {
  const text = formatReport(results, services)

  await Promise.allSettled(
    channels
      .filter(c => c.enabled)
      .map(channel =>
        fetch(`https://api.telegram.org/bot${channel.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channel.chat_id,
            text,
            parse_mode: 'HTML',
          }),
        }).then(async res => {
          if (!res.ok) {
            const body = await res.text()
            console.error(`[telegram] Failed to send to channel ${channel.id}: ${res.status} ${body}`)
          }
        }).catch(err => {
          console.error(`[telegram] Error sending to channel ${channel.id}:`, err)
        })
      )
  )
}

export async function sendTestMessage(channel: AlertChannel): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${channel.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channel.chat_id,
        text: `✅ Test message from <b>Services Healthcheck</b>\n\nChannel: <code>${channel.name}</code>`,
        parse_mode: 'HTML',
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `HTTP ${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error' }
  }
}
