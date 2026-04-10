import { NextRequest, NextResponse } from 'next/server'
import { getAlertChannels, createAlertChannel } from '@/lib/db'

export async function GET() {
  return NextResponse.json(getAlertChannels())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, chat_id, bot_token, enabled } = body

  if (!name || !chat_id || !bot_token) {
    return NextResponse.json({ error: 'Missing required fields: name, chat_id, bot_token' }, { status: 400 })
  }

  const channel = createAlertChannel({ name, chat_id, bot_token, enabled: enabled ?? 1 })
  return NextResponse.json(channel, { status: 201 })
}
