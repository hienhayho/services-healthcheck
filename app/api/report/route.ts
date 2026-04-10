import { NextResponse } from 'next/server'
import { getEnabledServices, getEnabledAlertChannels } from '@/lib/db'
import { runCheck } from '@/lib/checkers'
import { sendReport } from '@/lib/telegram'

export async function POST() {
  const channels = getEnabledAlertChannels()
  if (channels.length === 0) {
    return NextResponse.json({ error: 'No alert channels configured' }, { status: 400 })
  }

  const services = getEnabledServices()
  if (services.length === 0) {
    return NextResponse.json({ error: 'No enabled services' }, { status: 400 })
  }

  const results = await Promise.all(services.map(s => runCheck(s)))

  await sendReport(results, services, channels)

  return NextResponse.json({ ok: true, sent: results.length })
}
