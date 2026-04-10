import { NextRequest, NextResponse } from 'next/server'
import { getServiceById, getEnabledAlertChannels, getServices } from '@/lib/db'
import { runCheck } from '@/lib/checkers'
import { sendReport } from '@/lib/telegram'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const service = getServiceById(Number(id))
  if (!service) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await runCheck(service)

  const channels = getEnabledAlertChannels()
  if (channels.length > 0) {
    const services = getServices()
    await sendReport([result], services, channels)
  }

  return NextResponse.json(result)
}
