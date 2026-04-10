import { NextRequest, NextResponse } from 'next/server'
import { getAlertChannelById, updateAlertChannel, deleteAlertChannel } from '@/lib/db'
import { sendTestMessage } from '@/lib/telegram'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const channel = getAlertChannelById(Number(id))
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(channel)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { name, chat_id, bot_token, enabled } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (chat_id !== undefined) updates.chat_id = chat_id
  if (bot_token !== undefined) updates.bot_token = bot_token
  if (enabled !== undefined) updates.enabled = enabled

  const channel = updateAlertChannel(Number(id), updates)
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(channel)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const channel = getAlertChannelById(Number(id))
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  deleteAlertChannel(Number(id))
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const url = new URL(req.url)
  if (!url.pathname.endsWith('/test')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const channel = getAlertChannelById(Number(id))
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const result = await sendTestMessage(channel)
  return NextResponse.json(result)
}
