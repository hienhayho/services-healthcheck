import { getResults, getResultsCount, getServices } from '@/lib/db'
import { HistoryClient } from './history-client'

export const dynamic = 'force-dynamic'

export default function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ service_id?: string; page?: string; date_from?: string; date_to?: string }>
}) {
  return <HistoryLoader searchParams={searchParams} />
}

async function HistoryLoader({
  searchParams,
}: {
  searchParams: Promise<{ service_id?: string; page?: string; date_from?: string; date_to?: string }>
}) {
  const params = await searchParams
  const PAGE_SIZE = 10
  const page = Number(params.page ?? 1)
  const service_id = params.service_id ? Number(params.service_id) : undefined
  const date_from = params.date_from ?? undefined
  const date_to = params.date_to ?? undefined
  const offset = (page - 1) * PAGE_SIZE

  const services = getServices()
  const results = getResults({ service_id, date_from, date_to, limit: PAGE_SIZE, offset })
  const total = getResultsCount({ service_id, date_from, date_to })

  return (
    <HistoryClient
      services={services}
      results={results}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      serviceIdFilter={service_id}
      dateFrom={date_from}
      dateTo={date_to}
    />
  )
}
