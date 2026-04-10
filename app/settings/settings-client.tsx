'use client'

import { useState } from 'react'
import { AlertChannel } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Send, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Pagination } from '@/components/pagination'

const PAGE_SIZE = 10

interface FormState {
  name: string
  chat_id: string
  bot_token: string
  enabled: boolean
}

const defaultForm: FormState = { name: '', chat_id: '', bot_token: '', enabled: true }

export function SettingsClient({ channels: initial }: { channels: AlertChannel[] }) {
  const [channels, setChannels] = useState(initial)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(channels.length / PAGE_SIZE))
  const pagedChannels = channels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const [editing, setEditing] = useState<AlertChannel | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [testStates, setTestStates] = useState<Record<number, 'idle' | 'loading' | 'ok' | 'error'>>({})

  function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setOpen(true)
  }

  function openEdit(c: AlertChannel) {
    setEditing(c)
    setForm({ name: c.name, chat_id: c.chat_id, bot_token: c.bot_token, enabled: c.enabled === 1 })
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, enabled: form.enabled ? 1 : 0 }
    const url = editing ? `/api/alert-channels/${editing.id}` : '/api/alert-channels'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      setChannels(prev =>
        editing ? prev.map(c => c.id === editing.id ? data : c) : [...prev, data]
      )
      setOpen(false)
    } else {
      const err = await res.json()
      alert(err.error ?? 'Save failed')
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/alert-channels/${id}`, { method: 'DELETE' })
    setChannels(prev => prev.filter(c => c.id !== id))
    setDeleteId(null)
  }

  async function handleTest(id: number) {
    setTestStates(s => ({ ...s, [id]: 'loading' }))
    const res = await fetch(`/api/alert-channels/${id}/test`, { method: 'POST' })
    const data = await res.json()
    setTestStates(s => ({ ...s, [id]: data.ok ? 'ok' : 'error' }))
    setTimeout(() => setTestStates(s => ({ ...s, [id]: 'idle' })), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground text-sm">Manage Telegram alert channels</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Channel</Button>
      </div>

      {channels.length === 0 ? (
        <p className="text-muted-foreground text-sm">No alert channels configured yet.</p>
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Chat ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedChannels.map(c => {
                const testState = testStates[c.id] ?? 'idle'
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.chat_id}</TableCell>
                    <TableCell>
                      <Badge variant={c.enabled ? 'default' : 'secondary'}>
                        {c.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => handleTest(c.id)}
                        disabled={testState === 'loading'}
                        title="Send test message"
                      >
                        {testState === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {testState === 'ok' && <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                        {testState === 'error' && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        {testState === 'idle' && <Send className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={channels.length}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Channel' : 'Add Telegram Channel'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Team" />
            </div>
            <div className="space-y-1.5">
              <Label>Bot Token</Label>
              <Input type="password" value={form.bot_token} onChange={e => setForm(f => ({ ...f, bot_token: e.target.value }))} placeholder="123456:ABC-DEF..." />
            </div>
            <div className="space-y-1.5">
              <Label>Chat ID</Label>
              <Input value={form.chat_id} onChange={e => setForm(f => ({ ...f, chat_id: e.target.value }))} placeholder="-1001234567890" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} id="ch-enabled" />
              <Label htmlFor="ch-enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete channel?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
