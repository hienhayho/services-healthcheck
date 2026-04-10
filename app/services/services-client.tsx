'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Service } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { CronBuilder } from '@/components/cron-builder'

const PAGE_SIZE = 10

type ServiceType = 'llm' | 'embedding' | 'http'

interface FormState {
  name: string
  type: ServiceType
  cron: string
  enabled: boolean
  // llm / embedding
  url: string
  model: string
  api_key: string
  prompt: string
  input: string
  timeout_ms: string
  // http
  method: string
  expected_status: string
  headers: string
}

const defaultForm: FormState = {
  name: '', type: 'http', cron: '*/5 * * * *', enabled: true,
  url: '', model: '', api_key: '', prompt: 'Say hello', input: 'hello',
  timeout_ms: '5000', method: 'GET', expected_status: '200', headers: '{}',
}

function buildConfig(form: FormState): Record<string, unknown> {
  if (form.type === 'llm') {
    return { url: form.url, model: form.model, api_key: form.api_key, prompt: form.prompt, timeout_ms: Number(form.timeout_ms) }
  }
  if (form.type === 'embedding') {
    return { url: form.url, model: form.model, api_key: form.api_key, input: form.input, timeout_ms: Number(form.timeout_ms) }
  }
  return {
    url: form.url,
    method: form.method,
    expected_status: Number(form.expected_status),
    headers: JSON.parse(form.headers || '{}'),
    timeout_ms: Number(form.timeout_ms),
  }
}

function parseConfig(type: ServiceType, config: string): Partial<FormState> {
  try {
    const c = JSON.parse(config)
    return {
      url: c.url ?? '',
      model: c.model ?? '',
      api_key: c.api_key ?? '',
      prompt: c.prompt ?? 'Say hello',
      input: c.input ?? 'hello',
      timeout_ms: String(c.timeout_ms ?? 5000),
      method: (c.method as string | null) || 'GET',
      expected_status: String(c.expected_status ?? 200),
      headers: JSON.stringify(c.headers ?? {}),
    }
  } catch {
    return {}
  }
}

export function ServicesClient({ services: initial }: { services: Service[] }) {
  const router = useRouter()
  const [services, setServices] = useState(initial)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const totalPages = Math.max(1, Math.ceil(services.length / PAGE_SIZE))
  const pagedServices = services.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setForm({
      ...defaultForm,
      name: s.name,
      type: s.type as ServiceType,
      cron: s.cron,
      enabled: s.enabled === 1,
      ...parseConfig(s.type as ServiceType, s.config),
    })
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    let config: Record<string, unknown>
    try {
      config = buildConfig(form)
    } catch {
      alert('Invalid JSON in headers field')
      setSaving(false)
      return
    }

    const payload = {
      name: form.name,
      type: form.type,
      cron: form.cron,
      enabled: form.enabled ? 1 : 0,
      config,
    }

    const url = editing ? `/api/services/${editing.id}` : '/api/services'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
      const data = await res.json()
      setServices(prev =>
        editing
          ? prev.map(s => s.id === editing.id ? data : s)
          : [...prev, data]
      )
    } else {
      const err = await res.json()
      alert(err.error ?? 'Save failed')
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/services/${id}`, { method: 'DELETE' })
    setServices(prev => prev.filter(s => s.id !== id))
    setDeleteId(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services</h2>
          <p className="text-muted-foreground text-sm">Manage healthcheck configurations</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Service</Button>
      </div>

      {services.length === 0 ? (
        <p className="text-muted-foreground text-sm">No services yet.</p>
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cron</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedServices.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{s.cron}</TableCell>
                  <TableCell>
                    <Badge variant={s.enabled ? 'default' : 'secondary'}>
                      {s.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={services.length}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as ServiceType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llm">LLM</SelectItem>
                    <SelectItem value="embedding">Embedding</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>URL / Endpoint</Label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://api.example.com/v1/..." />
            </div>

            {(form.type === 'llm' || form.type === 'embedding') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Model</Label>
                    <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>API Key</Label>
                    <Input type="password" value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} />
                  </div>
                </div>
                {form.type === 'llm' && (
                  <div className="space-y-1.5">
                    <Label>Prompt</Label>
                    <Input value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} />
                  </div>
                )}
                {form.type === 'embedding' && (
                  <div className="space-y-1.5">
                    <Label>Input text</Label>
                    <Input value={form.input} onChange={e => setForm(f => ({ ...f, input: e.target.value }))} />
                  </div>
                )}
              </>
            )}

            {form.type === 'http' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Method</Label>
                  <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v ?? 'GET' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['GET', 'POST', 'PUT', 'HEAD'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Expected Status</Label>
                  <Input value={form.expected_status} onChange={e => setForm(f => ({ ...f, expected_status: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Timeout (ms)</Label>
                  <Input value={form.timeout_ms} onChange={e => setForm(f => ({ ...f, timeout_ms: e.target.value }))} />
                </div>
              </div>
            )}

            {form.type !== 'http' && (
              <div className="space-y-1.5">
                <Label>Timeout (ms)</Label>
                <Input value={form.timeout_ms} onChange={e => setForm(f => ({ ...f, timeout_ms: e.target.value }))} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Schedule</Label>
              <CronBuilder value={form.cron} onChange={cron => setForm(f => ({ ...f, cron }))} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} id="enabled" />
              <Label htmlFor="enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete service?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will also delete all check results for this service.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
