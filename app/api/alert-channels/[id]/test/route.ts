import { NextRequest, NextResponse } from 'next/server'
import { getAlertChannelById } from '@/lib/db'
import { sendTestMessage } from '@/lib/telegram'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const channel = getAlertChannelById(Number(id))
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const result = await sendTestMessage(channel)
  return NextResponse.json(result)
}
