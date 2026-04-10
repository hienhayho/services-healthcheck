import { NextRequest, NextResponse } from 'next/server'
import { getEnabledServices, getEnabledAlertChannels } from '@/lib/db'
import { runCheck } from '@/lib/checkers'
import { sendReport } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  let body: TelegramUpdate
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  console.log('[webhook] update:', JSON.stringify(body))

  const message = body.message ?? body.channel_post
  if (!message?.text) return NextResponse.json({ ok: true })

  const text = message.text.trim().toLowerCase()
  const botUsername = (process.env.TELEGRAM_BOT_USERNAME ?? '').toLowerCase()

  // Trigger if:
  // 1. Message contains a @mention entity pointing to this bot
  // 2. Message text contains @botusername (fallback)
  // 3. Message is /report or /status command
  const hasMentionEntity = (message.entities ?? []).some(
    e => e.type === 'mention' &&
      message.text!.slice(e.offset, e.offset + e.length).toLowerCase() === `@${botUsername}`
  )
  const hasMentionText = botUsername && text.includes(`@${botUsername}`)
  const isCommand = text.startsWith('/report') || text.startsWith('/status')

  const shouldTrigger = isCommand || hasMentionEntity || hasMentionText

  console.log(`[webhook] text="${text}" botUsername="${botUsername}" hasMentionEntity=${hasMentionEntity} hasMentionText=${hasMentionText} isCommand=${isCommand} shouldTrigger=${shouldTrigger}`)

  if (!shouldTrigger) return NextResponse.json({ ok: true })

  const channels = getEnabledAlertChannels()
  const services = getEnabledServices()

  if (services.length === 0) {
    console.log('[webhook] no enabled services, skipping')
    return NextResponse.json({ ok: true })
  }

  if (channels.length === 0) {
    console.log('[webhook] no alert channels, skipping')
    return NextResponse.json({ ok: true })
  }

  console.log(`[webhook] triggering report for ${services.length} services`)

  void (async () => {
    try {
      const results = await Promise.all(services.map(s => runCheck(s)))
      await sendReport(results, services, channels)
      console.log('[webhook] report sent')
    } catch (err) {
      console.error('[webhook] error running report:', err)
    }
  })()

  return NextResponse.json({ ok: true })
}

interface TelegramEntity {
  type: string
  offset: number
  length: number
}

interface TelegramUpdate {
  message?: TelegramMessage
  channel_post?: TelegramMessage
}

interface TelegramMessage {
  text?: string
  chat: { id: number }
  entities?: TelegramEntity[]
}
