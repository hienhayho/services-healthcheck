import { NextRequest, NextResponse } from 'next/server'
import { processWebhookUpdate } from '@/lib/webhook'
import { getAlertChannels } from '@/lib/db'

/**
 * Simulates a Telegram webhook update for testing purposes.
 * Auth-protected (goes through layout auth). Does NOT require the webhook secret token.
 *
 * Body: { text: string, channelId?: number }
 * channelId: if provided, only that channel receives the report.
 *            if omitted, all enabled channels receive the report (default behaviour).
 */
export async function POST(req: NextRequest) {
  let body: { text: string; channelId?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const text = (body.text ?? '').trim()
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // Validate channelId if provided
  if (body.channelId !== undefined) {
    const all = getAlertChannels()
    const found = all.find(c => c.id === body.channelId)
    if (!found) {
      return NextResponse.json({ error: `channel ${body.channelId} not found` }, { status: 404 })
    }
  }

  console.log(`[simulate] text="${text}" channelId=${body.channelId ?? 'all'}`)

  const result = await processWebhookUpdate(
    {
      message: {
        text,
        chat: { id: 0 },
        entities: [],
      },
    },
    body.channelId
  )

  return NextResponse.json({ ok: true, ...result })
}
