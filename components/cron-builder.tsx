'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle } from 'lucide-react'

// ── Client-side cron validator ─────────────────────────────────────────────
// Validates a 5-field cron expression (min hour dom month dow).
// Returns null if valid, or an error string describing the problem.

type FieldSpec = { name: string; min: number; max: number }
const FIELDS: FieldSpec[] = [
  { name: 'minute',     min: 0, max: 59 },
  { name: 'hour',       min: 0, max: 23 },
  { name: 'day',        min: 1, max: 31 },
  { name: 'month',      min: 1, max: 12 },
  { name: 'weekday',    min: 0, max: 7  },
]

function validateField(token: string, { name, min, max }: FieldSpec): string | null {
  if (token === '*') return null

  // */step
  const stepMatch = token.match(/^\*\/(\d+)$/)
  if (stepMatch) {
    const step = Number(stepMatch[1])
    if (step < 1) return `${name}: step must be ≥ 1`
    if (step > max) return `${name}: step ${step} exceeds max ${max}`
    return null
  }

  // range: N-M or N-M/step
  const rangeMatch = token.match(/^(\d+)-(\d+)(?:\/(\d+))?$/)
  if (rangeMatch) {
    const lo = Number(rangeMatch[1])
    const hi = Number(rangeMatch[2])
    if (lo < min || lo > max) return `${name}: ${lo} out of range ${min}–${max}`
    if (hi < min || hi > max) return `${name}: ${hi} out of range ${min}–${max}`
    if (lo > hi) return `${name}: range start ${lo} > end ${hi}`
    if (rangeMatch[3]) {
      const step = Number(rangeMatch[3])
      if (step < 1) return `${name}: step must be ≥ 1`
    }
    return null
  }

  // list: N,M,... (each item can itself be a range or plain number)
  if (token.includes(',')) {
    for (const part of token.split(',')) {
      const err = validateField(part, { name, min, max })
      if (err) return err
    }
    return null
  }

  // plain number
  if (/^\d+$/.test(token)) {
    const n = Number(token)
    if (n < min || n > max) return `${name}: ${n} out of range ${min}–${max}`
    return null
  }

  return `${name}: unrecognised token "${token}"`
}

export function validateCron(expr: string): string | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return `Expected 5 fields, got ${parts.length}`
  for (let i = 0; i < 5; i++) {
    const err = validateField(parts[i], FIELDS[i])
    if (err) return err
  }
  return null
}

// ── Presets ────────────────────────────────────────────────────────────────
const PRESETS: { label: string; value: string; description: string }[] = [
  { label: 'Every minute',    value: '* * * * *',      description: 'Runs 60×/hr' },
  { label: 'Every 2 min',     value: '*/2 * * * *',    description: 'Runs 30×/hr' },
  { label: 'Every 5 min',     value: '*/5 * * * *',    description: 'Runs 12×/hr' },
  { label: 'Every 10 min',    value: '*/10 * * * *',   description: 'Runs 6×/hr' },
  { label: 'Every 15 min',    value: '*/15 * * * *',   description: 'Runs 4×/hr' },
  { label: 'Every 30 min',    value: '*/30 * * * *',   description: 'Runs 2×/hr' },
  { label: 'Every hour',      value: '0 * * * *',      description: 'On the hour' },
  { label: 'Every 2 hours',   value: '0 */2 * * *',    description: 'Every 2h' },
  { label: 'Every 6 hours',   value: '0 */6 * * *',    description: 'Every 6h' },
  { label: 'Every 12 hours',  value: '0 */12 * * *',   description: 'Twice daily' },
  { label: 'Once a day',      value: '0 0 * * *',      description: 'Midnight UTC' },
  { label: 'Custom',          value: '__custom__',      description: 'Type manually' },
]

function matchPreset(cron: string): string {
  const p = PRESETS.find(p => p.value === cron)
  return p && p.value !== '__custom__' ? p.value : '__custom__'
}

// ── Simple interval builder ────────────────────────────────────────────────
type Unit = 'minutes' | 'hours'

function buildSimpleCron(interval: number, unit: Unit): string {
  if (unit === 'minutes') {
    if (interval === 60) return '0 * * * *'
    return `*/${interval} * * * *`
  }
  if (interval === 24) return '0 0 * * *'
  return `0 */${interval} * * *`
}

function parseSimple(cron: string): { interval: number; unit: Unit } | null {
  const mMin = cron.match(/^\*\/(\d+) \* \* \* \*$/)
  if (mMin) return { interval: Number(mMin[1]), unit: 'minutes' }
  if (cron === '* * * * *') return { interval: 1, unit: 'minutes' }
  const mHr = cron.match(/^0 \*\/(\d+) \* \* \*$/)
  if (mHr) return { interval: Number(mHr[1]), unit: 'hours' }
  if (cron === '0 * * * *') return { interval: 1, unit: 'hours' }
  if (cron === '0 0 * * *') return { interval: 24, unit: 'hours' }
  return null
}

// ── Human description ──────────────────────────────────────────────────────
function describeCron(cron: string): string {
  if (validateCron(cron) !== null) return ''   // don't describe invalid expressions
  const parts = cron.trim().split(/\s+/)
  const [min, hr] = parts

  const simple = parseSimple(cron)
  if (simple) {
    const { interval, unit } = simple
    if (interval === 1) return `Every ${unit === 'minutes' ? 'minute' : 'hour'}`
    return `Every ${interval} ${unit}`
  }

  if (min === '0' && hr === '0') return 'Once a day at midnight UTC'
  if (min === '0') {
    const hrDesc = hr.startsWith('*/') ? `every ${hr.slice(2)} hours` : `at ${hr}:00`
    return `Runs ${hrDesc}`
  }
  if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`

  return `Schedule: ${cron}`
}

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  value: string
  onChange: (cron: string) => void
}

export function CronBuilder({ value, onChange }: Props) {
  const [preset, setPreset] = useState(() => matchPreset(value))
  const [custom, setCustom] = useState(value)
  const [validationError, setValidationError] = useState<string | null>(() => validateCron(value))

  const simple = parseSimple(value)
  const [interval, setIntervalVal] = useState<number>(simple?.interval ?? 5)
  const [unit, setUnit] = useState<Unit>(simple?.unit ?? 'minutes')

  // sync when parent resets form
  useEffect(() => {
    setPreset(matchPreset(value))
    setCustom(value)
    setValidationError(validateCron(value))
    const s = parseSimple(value)
    if (s) { setIntervalVal(s.interval); setUnit(s.unit) }
  }, [value])

  function handlePresetChange(v: string) {
    setPreset(v)
    if (v !== '__custom__') {
      setValidationError(validateCron(v))  // presets are always valid
      onChange(v)
      const s = parseSimple(v)
      if (s) { setIntervalVal(s.interval); setUnit(s.unit) }
    }
  }

  function handleSimpleChange(newInterval: number, newUnit: Unit) {
    setIntervalVal(newInterval)
    setUnit(newUnit)
    const cron = buildSimpleCron(newInterval, newUnit)
    setCustom(cron)
    setValidationError(validateCron(cron))
    onChange(cron)
    setPreset(matchPreset(cron))
  }

  function handleCustomChange(v: string) {
    setCustom(v)
    setValidationError(validateCron(v))
    onChange(v)
    setPreset(matchPreset(v))
  }

  const isCustom = preset === '__custom__'
  const description = describeCron(value)
  const isValid = validationError === null

  return (
    <div className="space-y-2.5">
      {/* Preset selector */}
      <Select value={preset} onValueChange={v => handlePresetChange(v ?? preset)}>
        <SelectTrigger className="font-mono text-sm bg-secondary/50 border-border/60">
          <SelectValue placeholder="Choose schedule…" />
        </SelectTrigger>
        <SelectContent className="min-w-[200px]">
          {PRESETS.map(p => (
            <SelectItem key={p.value} value={p.value}>
              <div className="flex flex-col gap-0.5 py-0.5">
                <span className="font-mono text-sm">{p.label}</span>
                {p.value !== '__custom__' && (
                  <span className="text-xs text-muted-foreground font-mono">{p.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Expression input with validation icon */}
      <div className="relative">
        <Input
          value={isCustom ? custom : value}
          onChange={e => handleCustomChange(e.target.value)}
          readOnly={!isCustom}
          placeholder="* * * * *"
          className={cn(
            'font-mono text-sm bg-secondary/50 pr-8',
            !isCustom && 'cursor-default opacity-70 select-none',
            isCustom && validationError !== null
              ? 'border-destructive/70 focus-visible:ring-destructive/30'
              : isCustom
              ? 'border-primary/50 focus-visible:ring-primary/30'
              : 'border-border/60'
          )}
        />
        {/* validation icon — only shown in custom mode */}
        {isCustom && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {isValid
              ? <CheckCircle2 className="h-4 w-4 text-primary/70" />
              : <XCircle className="h-4 w-4 text-destructive/70" />
            }
          </span>
        )}
      </div>

      {/* Validation error message */}
      {isCustom && validationError !== null && (
        <p className="text-xs font-mono text-destructive flex items-center gap-1.5 px-0.5">
          <XCircle className="h-3 w-3 shrink-0" />
          {validationError}
        </p>
      )}

      {/* Quick interval builder */}
      {isCustom && (
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">Every</span>
          <Input
            type="number"
            min={1}
            max={unit === 'minutes' ? 59 : 23}
            value={interval}
            onChange={e => {
              const n = Math.max(1, Number(e.target.value))
              handleSimpleChange(n, unit)
            }}
            className="w-16 h-7 text-center font-mono text-sm bg-transparent border-border/60 px-1"
          />
          <Select value={unit} onValueChange={v => handleSimpleChange(interval, (v ?? unit) as Unit)}>
            <SelectTrigger className="w-28 h-7 text-sm font-mono bg-transparent border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">minutes</SelectItem>
              <SelectItem value="hours">hours</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">→ fills expression</span>
        </div>
      )}

      {/* Human-readable description — shown when valid */}
      {description && (
        <p className="text-xs font-mono text-primary/80 flex items-center gap-1.5 px-0.5">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          {description}
        </p>
      )}
    </div>
  )
}
