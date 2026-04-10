import cron, { ScheduledTask } from 'node-cron'
import { getEnabledServices, getServiceById, getEnabledAlertChannels, Service } from './db'
import { runCheck } from './checkers'
import { sendReport } from './telegram'

const jobs = new Map<number, ScheduledTask>()

async function executeChecks(service: Service): Promise<void> {
  try {
    console.log(`[scheduler] Running check for service: ${service.name} (id=${service.id})`)
    const result = await runCheck(service)
    const channels = getEnabledAlertChannels()
    if (channels.length > 0) {
      await sendReport([result], [service], channels)
    }
    console.log(`[scheduler] Check complete for ${service.name}: ${result.status} (${result.latency_ms ?? 'timeout'}ms)`)
  } catch (err) {
    console.error(`[scheduler] Error during check for service ${service.id}:`, err)
  }
}

export function startScheduler(): void {
  const services = getEnabledServices()
  console.log(`[scheduler] Starting with ${services.length} enabled service(s)`)
  for (const service of services) {
    scheduleService(service)
  }
}

function scheduleService(service: Service): void {
  if (!cron.validate(service.cron)) {
    console.warn(`[scheduler] Invalid cron expression for service ${service.id}: ${service.cron}`)
    return
  }

  const task: ScheduledTask = cron.schedule(service.cron, () => executeChecks(service))
  jobs.set(service.id, task)
  console.log(`[scheduler] Scheduled service ${service.name} (id=${service.id}) with cron: ${service.cron}`)
}

export function reloadService(serviceId: number): void {
  stopService(serviceId)
  const service = getServiceById(serviceId)
  if (service && service.enabled) {
    scheduleService(service)
  }
}

export function stopService(serviceId: number): void {
  const task = jobs.get(serviceId)
  if (task) {
    task.stop()
    jobs.delete(serviceId)
    console.log(`[scheduler] Stopped service id=${serviceId}`)
  }
}

export function getScheduledServiceIds(): number[] {
  return Array.from(jobs.keys())
}
