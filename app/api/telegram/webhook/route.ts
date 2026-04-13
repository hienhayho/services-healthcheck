import { NextRequest, NextResponse } from 'next/server'
import { processWebhookUpdate, TelegramUpdate } from '@/lib/webhook'

export async function POST(req: NextRequest) {
  // Verify request is from Telegram using secret token
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secretToken) {
    const incoming = req.headers.get('x-telegram-bot-api-secret-token')
    if (incoming !== secretToken) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  }

  let body: TelegramUpdate
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  console.log('[webhook] update:', JSON.stringify(body))

  await processWebhookUpdate(body)

  return NextResponse.json({ ok: true })
}
