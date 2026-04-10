import { NextResponse } from 'next/server'
import { getServices, getEnabledAlertChannels, getLatestResultPerService } from '@/lib/db'
import { sendReport } from '@/lib/telegram'

export async function POST() {
  const channels = getEnabledAlertChannels()
  if (channels.length === 0) {
    return NextResponse.json({ error: 'No alert channels configured' }, { status: 400 })
  }

  const results = getLatestResultPerService()
  if (results.length === 0) {
    return NextResponse.json({ error: 'No results to report yet' }, { status: 400 })
  }

  const services = getServices()
  await sendReport(results, services, channels)

  return NextResponse.json({ ok: true, sent: results.length })
}
