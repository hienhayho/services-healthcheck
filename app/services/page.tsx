import { getServices } from '@/lib/db'
import { ServicesClient } from './services-client'

export const dynamic = 'force-dynamic'

export default function ServicesPage() {
  const services = getServices()
  return <ServicesClient services={services} />
}
