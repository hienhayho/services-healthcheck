import { NextRequest, NextResponse } from 'next/server'
import { getResults, getResultsCount } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const service_id = searchParams.get('service_id') ? Number(searchParams.get('service_id')) : undefined
  const date_from = searchParams.get('date_from') ?? undefined
  const date_to = searchParams.get('date_to') ?? undefined
  const limit = Number(searchParams.get('limit') ?? '10')
  const offset = Number(searchParams.get('offset') ?? '0')

  const results = getResults({ service_id, date_from, date_to, limit, offset })
  const total = getResultsCount({ service_id, date_from, date_to })

  return NextResponse.json({ results, total, limit, offset })
}
