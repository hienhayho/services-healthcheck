import { NextRequest, NextResponse } from 'next/server'
import { getEnabledServices, getEnabledAlertChannels } from '@/lib/db'
import { runCheck } from '@/lib/checkers'
import { sendReport } from '@/lib/telegram'

// Telegram sends updates to this endpoint.
// Register with: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain/api/telegram/webhook

export async function POST(req: NextRequest) {
  let body: TelegramUpdate
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const message = body.message ?? body.channel_post
  if (!message?.text) return NextResponse.json({ ok: true })

  const text = message.text.trim()
  const botUsername = process.env.TELEGRAM_BOT_USERNAME

  // Respond to: "@botname report", "@botname status", or just "/report" (in private chat)
  const mentioned = botUsername && text.includes(`@${botUsername}`)
  const isCommand = text.startsWith('/report') || text.startsWith('/status')
  const isMentionWithKeyword = mentioned &&
    (text.toLowerCase().includes('report') || text.toLowerCase().includes('status'))

  if (!isCommand && !isMentionWithKeyword) {
    return NextResponse.json({ ok: true })
  }

  const channels = getEnabledAlertChannels()
  const services = getEnabledServices()

  if (channels.length === 0 || services.length === 0) {
    return NextResponse.json({ ok: true })
  }

  // Run checks and send report in background — respond to Telegram immediately
  void (async () => {
    const results = await Promise.all(services.map(s => runCheck(s)))
    await sendReport(results, services, channels)
  })()

  return NextResponse.json({ ok: true })
}

interface TelegramUpdate {
  message?: TelegramMessage
  channel_post?: TelegramMessage
}

interface TelegramMessage {
  text?: string
  chat: { id: number }
}
