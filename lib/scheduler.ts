import cron, { ScheduledTask } from 'node-cron'
import { getEnabledServices, getServiceById, getEnabledAlertChannels, Service } from './db'
import { runCheck } from './checkers'
import { sendReport } from './telegram'

// Map from cron expression to its scheduled task
const cronJobs = new Map<string, ScheduledTask>()
// Map from service id to its cron expression (for lookup on reload/stop)
const serviceToC = new Map<number, string>()

async function executeGroupChecks(services: Service[]): Promise<void> {
  const names = services.map(s => s.name).join(', ')
  try {
    console.log(`[scheduler] Running checks for group (${services.length} services): ${names}`)
    const results = await Promise.all(services.map(s => runCheck(s)))
    const channels = getEnabledAlertChannels()
    if (channels.length > 0) {
      await sendReport(results, services, channels)
    }
    console.log(`[scheduler] Group check complete for: ${names}`)
  } catch (err) {
    console.error(`[scheduler] Error during group check for: ${names}`, err)
  }
}

function rebuildCronJob(cronExpr: string): void {
  // Stop and remove the existing job for this expression if any
  const existing = cronJobs.get(cronExpr)
  if (existing) {
    existing.stop()
    cronJobs.delete(cronExpr)
  }

  // Find all currently-tracked services that use this cron expression
  const allServices = getEnabledServices()
  const group = allServices.filter(s => s.cron === cronExpr)

  if (group.length === 0) return

  if (!cron.validate(cronExpr)) {
    console.warn(`[scheduler] Invalid cron expression: ${cronExpr}`)
    return
  }

  const task = cron.schedule(cronExpr, () => {
    // Re-fetch services at tick time so additions/removals are reflected
    const current = getEnabledServices().filter(s => s.cron === cronExpr)
    if (current.length > 0) executeGroupChecks(current)
  })
  cronJobs.set(cronExpr, task)
  console.log(`[scheduler] Scheduled cron "${cronExpr}" for ${group.length} service(s): ${group.map(s => s.name).join(', ')}`)
}

export function startScheduler(): void {
  const services = getEnabledServices()
  console.log(`[scheduler] Starting with ${services.length} enabled service(s)`)

  // Group services by cron expression
  const groups = new Map<string, Service[]>()
  for (const service of services) {
    const list = groups.get(service.cron) ?? []
    list.push(service)
    groups.set(service.cron, list)
    serviceToC.set(service.id, service.cron)
  }

  for (const [cronExpr, group] of groups) {
    if (!cron.validate(cronExpr)) {
      console.warn(`[scheduler] Invalid cron expression: ${cronExpr}`)
      continue
    }
    const task = cron.schedule(cronExpr, () => {
      const current = getEnabledServices().filter(s => s.cron === cronExpr)
      if (current.length > 0) executeGroupChecks(current)
    })
    cronJobs.set(cronExpr, task)
    console.log(`[scheduler] Scheduled cron "${cronExpr}" for ${group.length} service(s): ${group.map(s => s.name).join(', ')}`)
  }
}

export function reloadService(serviceId: number): void {
  const service = getServiceById(serviceId)
  const oldCron = serviceToC.get(serviceId)

  if (service && service.enabled) {
    serviceToC.set(serviceId, service.cron)
  } else {
    serviceToC.delete(serviceId)
  }

  // Rebuild the job(s) affected: old cron group and new cron group (may be same)
  const cronExprs = new Set<string>()
  if (oldCron) cronExprs.add(oldCron)
  if (service?.cron) cronExprs.add(service.cron)
  for (const expr of cronExprs) {
    rebuildCronJob(expr)
  }
}

export function stopService(serviceId: number): void {
  const cronExpr = serviceToC.get(serviceId)
  serviceToC.delete(serviceId)
  if (cronExpr) {
    rebuildCronJob(cronExpr)
    console.log(`[scheduler] Removed service id=${serviceId} from cron group "${cronExpr}"`)
  }
}

export function getScheduledServiceIds(): number[] {
  return Array.from(serviceToC.keys())
}
