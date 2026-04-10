import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export type ServiceType = 'llm' | 'embedding' | 'http'
export type CheckStatus = 'ok' | 'degraded' | 'down'

export interface Service {
  id: number
  name: string
  type: ServiceType
  enabled: number
  cron: string
  config: string
  created_at: string
  updated_at: string
}

export interface CheckResult {
  id: number
  service_id: number
  status: CheckStatus
  latency_ms: number | null
  message: string | null
  checked_at: string
}

export interface AlertChannel {
  id: number
  name: string
  chat_id: string
  bot_token: string
  enabled: number
  created_at: string
}

const DB_PATH = path.join(process.cwd(), 'data', 'healthcheck.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDb(): void {
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  const database = getDb()
  database.exec(schema)
}

// --- Services ---

export function getServices(): Service[] {
  return getDb().prepare('SELECT * FROM services ORDER BY name').all() as Service[]
}

export function getEnabledServices(): Service[] {
  return getDb().prepare('SELECT * FROM services WHERE enabled = 1').all() as Service[]
}

export function getServiceById(id: number): Service | undefined {
  return getDb().prepare('SELECT * FROM services WHERE id = ?').get(id) as Service | undefined
}

export function createService(data: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Service {
  const db = getDb()
  const result = db.prepare(
    'INSERT INTO services (name, type, enabled, cron, config) VALUES (?, ?, ?, ?, ?)'
  ).run(data.name, data.type, data.enabled, data.cron, data.config)
  return getServiceById(result.lastInsertRowid as number)!
}

export function updateService(id: number, data: Partial<Omit<Service, 'id' | 'created_at' | 'updated_at'>>): Service | undefined {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
  const values = Object.values(data)
  getDb().prepare(
    `UPDATE services SET ${fields}, updated_at = datetime('now') WHERE id = ?`
  ).run(...values, id)
  return getServiceById(id)
}

export function deleteService(id: number): void {
  getDb().prepare('DELETE FROM services WHERE id = ?').run(id)
}

// --- Check Results ---

export function insertResult(data: Omit<CheckResult, 'id' | 'checked_at'>): CheckResult {
  const db = getDb()
  const result = db.prepare(
    'INSERT INTO check_results (service_id, status, latency_ms, message) VALUES (?, ?, ?, ?)'
  ).run(data.service_id, data.status, data.latency_ms, data.message)
  return db.prepare('SELECT * FROM check_results WHERE id = ?').get(result.lastInsertRowid) as CheckResult
}

export function getResults(opts: {
  service_id?: number
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
} = {}): CheckResult[] {
  const { service_id, date_from, date_to, limit = 10, offset = 0 } = opts
  const conditions: string[] = []
  const params: unknown[] = []

  if (service_id) { conditions.push('service_id = ?'); params.push(service_id) }
  if (date_from)  { conditions.push('checked_at >= ?'); params.push(date_from) }
  if (date_to)    { conditions.push('checked_at <= ?'); params.push(date_to + ' 23:59:59') }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(limit, offset)
  return getDb().prepare(
    `SELECT * FROM check_results ${where} ORDER BY checked_at DESC LIMIT ? OFFSET ?`
  ).all(...params) as CheckResult[]
}

export function getResultsCount(opts: {
  service_id?: number
  date_from?: string
  date_to?: string
} = {}): number {
  const { service_id, date_from, date_to } = opts
  const conditions: string[] = []
  const params: unknown[] = []

  if (service_id) { conditions.push('service_id = ?'); params.push(service_id) }
  if (date_from)  { conditions.push('checked_at >= ?'); params.push(date_from) }
  if (date_to)    { conditions.push('checked_at <= ?'); params.push(date_to + ' 23:59:59') }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const row = getDb().prepare(`SELECT COUNT(*) as count FROM check_results ${where}`).get(...params) as { count: number }
  return row.count
}

export function getLatestResultPerService(): (CheckResult & { service_name: string; service_type: ServiceType })[] {
  return getDb().prepare(`
    SELECT cr.*, s.name as service_name, s.type as service_type
    FROM check_results cr
    INNER JOIN services s ON s.id = cr.service_id
    WHERE cr.id = (
      SELECT id FROM check_results cr2
      WHERE cr2.service_id = cr.service_id
      ORDER BY checked_at DESC LIMIT 1
    )
    ORDER BY s.name
  `).all() as (CheckResult & { service_name: string; service_type: ServiceType })[]
}

// --- Alert Channels ---

export function getAlertChannels(): AlertChannel[] {
  return getDb().prepare('SELECT * FROM alert_channels ORDER BY name').all() as AlertChannel[]
}

export function getEnabledAlertChannels(): AlertChannel[] {
  return getDb().prepare('SELECT * FROM alert_channels WHERE enabled = 1').all() as AlertChannel[]
}

export function getAlertChannelById(id: number): AlertChannel | undefined {
  return getDb().prepare('SELECT * FROM alert_channels WHERE id = ?').get(id) as AlertChannel | undefined
}

export function createAlertChannel(data: Omit<AlertChannel, 'id' | 'created_at'>): AlertChannel {
  const db = getDb()
  const result = db.prepare(
    'INSERT INTO alert_channels (name, chat_id, bot_token, enabled) VALUES (?, ?, ?, ?)'
  ).run(data.name, data.chat_id, data.bot_token, data.enabled)
  return getAlertChannelById(result.lastInsertRowid as number)!
}

export function updateAlertChannel(id: number, data: Partial<Omit<AlertChannel, 'id' | 'created_at'>>): AlertChannel | undefined {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
  const values = Object.values(data)
  getDb().prepare(`UPDATE alert_channels SET ${fields} WHERE id = ?`).run(...values, id)
  return getAlertChannelById(id)
}

export function deleteAlertChannel(id: number): void {
  getDb().prepare('DELETE FROM alert_channels WHERE id = ?').run(id)
}
