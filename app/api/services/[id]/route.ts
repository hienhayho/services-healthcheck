import { NextRequest, NextResponse } from 'next/server'
import { getServiceById, updateService, deleteService } from '@/lib/db'
import { reloadService, stopService } from '@/lib/scheduler'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const service = getServiceById(Number(id))
  if (!service) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(service)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { name, type, enabled, cron, config } = body

  if (type && !['llm', 'embedding', 'http'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (type !== undefined) updates.type = type
  if (enabled !== undefined) updates.enabled = enabled
  if (cron !== undefined) updates.cron = cron
  if (config !== undefined) updates.config = typeof config === 'string' ? config : JSON.stringify(config)

  const service = updateService(Number(id), updates)
  if (!service) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  reloadService(service.id)
  return NextResponse.json(service)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const service = getServiceById(Number(id))
  if (!service) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  stopService(Number(id))
  deleteService(Number(id))
  return NextResponse.json({ ok: true })
}
