'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Channel {
  id: number
  name: string
  enabled: number
}

interface Message {
  id: number
  from: 'user' | 'bot'
  text: string
}

const SUGGESTIONS = ['/report', '/status', '/help', '/chat hello']

export function WebhookChatTester() {
  const idSeq = useRef(0)
  const nextId = (): number => ++idSeq.current

  const [open, setOpen] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelId, setChannelId] = useState<number | 'all'>('all')
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 1, from: 'bot', text: 'Simulate a Telegram message. Select a channel to target, then send /report, /status, or /help.' },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingChannels, setLoadingChannels] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load channels when panel opens
  useEffect(() => {
    if (!open || channels.length > 0) return
    setLoadingChannels(true)
    fetch('/api/alert-channels')
      .then(r => r.json())
      .then((data: Channel[]) => setChannels(data))
      .catch(() => {/* silently ignore */})
      .finally(() => setLoadingChannels(false))
  }, [open, channels.length])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setInput('')
    setSending(true)
    setMessages(prev => [...prev, { id: nextId(), from: 'user', text: trimmed }])

    try {
      const body: { text: string; channelId?: number } = { text: trimmed }
      if (channelId !== 'all') body.channelId = channelId

      const res = await fetch('/api/telegram/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      let replyText: string
      if (!res.ok) {
        replyText = `❌ Error: ${data.error ?? res.statusText}`
      } else if (data.reply) {
        // Command returned a direct text reply (e.g. /help)
        replyText = data.reply
      } else if (data.triggered) {
        const target = channelId === 'all'
          ? 'all enabled channels'
          : (channels.find(c => c.id === channelId)?.name ?? `channel #${channelId}`)
        replyText = `✅ Report triggered for ${data.serviceCount ?? 0} service${data.serviceCount === 1 ? '' : 's'} → sent to ${target}.`
      } else {
        replyText = `ℹ️ Not triggered — ${data.reason ?? 'unknown reason'}.`
      }

      setMessages(prev => [...prev, { id: nextId(), from: 'bot', text: replyText }])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: nextId(), from: 'bot', text: `Network error: ${err instanceof Error ? err.message : 'unknown'}` },
      ])
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const selectedLabel = channelId === 'all'
    ? 'All channels'
    : (channels.find(c => c.id === channelId)?.name ?? '…')

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200',
          'bg-primary text-primary-foreground hover:scale-105 active:scale-95',
          open && 'rotate-90 opacity-80'
        )}
        aria-label="Toggle webhook tester"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-84 flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
            <Bot className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">Webhook Tester</p>
              <p className="text-xs text-muted-foreground mt-0.5">Simulate Telegram messages</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Channel selector */}
          <div className="border-b px-3 py-2">
            <p className="text-xs text-muted-foreground mb-1.5">Send report to:</p>
            {loadingChannels ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading channels…
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setChannelId('all')}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs border transition-colors',
                    channelId === 'all'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                  )}
                >
                  All channels
                </button>
                {channels.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setChannelId(c.id)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs border transition-colors',
                      channelId === c.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary',
                      !c.enabled && channelId !== c.id && 'opacity-50'
                    )}
                    title={c.enabled ? undefined : 'Channel is disabled'}
                  >
                    {c.name}
                    {!c.enabled && ' (off)'}
                  </button>
                ))}
                {channels.length === 0 && (
                  <span className="text-xs text-muted-foreground">No channels configured</span>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-3 overflow-y-auto p-4 h-60">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn('flex items-end gap-2', msg.from === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                  msg.from === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {msg.from === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug',
                  msg.from === 'user'
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm bg-muted text-foreground'
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-end gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          <div className="flex gap-1.5 px-4 pb-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={sending}
                className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t px-3 py-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              className="h-8 text-sm"
              disabled={sending}
            />
            <Button
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
