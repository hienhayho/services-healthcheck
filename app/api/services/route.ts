import { NextRequest, NextResponse } from 'next/server'
import { getServices, createService } from '@/lib/db'
import { reloadService } from '@/lib/scheduler'

export async function GET() {
  const services = getServices()
  return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, type, enabled, cron, config } = body

  if (!name || !type || !cron || !config) {
    return NextResponse.json({ error: 'Missing required fields: name, type, cron, config' }, { status: 400 })
  }
  if (!['llm', 'embedding', 'http'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const configStr = typeof config === 'string' ? config : JSON.stringify(config)
  const service = createService({
    name,
    type,
    enabled: enabled ?? 1,
    cron,
    config: configStr,
  })

  reloadService(service.id)
  return NextResponse.json(service, { status: 201 })
}
