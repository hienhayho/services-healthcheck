export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate required env vars before anything else
    const required = ['AUTH_USERNAME', 'AUTH_PASSWORD', 'AUTH_SECRET']
    const unset = required.filter(k => {
      const v = process.env[k]
      return !v || v === '__unset__' || v === 'build-time-placeholder'
    })
    if (unset.length > 0) {
      console.error(`\n[startup] ❌ Missing required environment variables:\n${unset.map(k => `  - ${k}`).join('\n')}\n`)
      process.exit(1)
    }

    const { initDb } = await import('./lib/db')
    const { startScheduler } = await import('./lib/scheduler')
    initDb()
    startScheduler()
    console.log('[startup] ✅ DB initialized and scheduler started')
  }
}
