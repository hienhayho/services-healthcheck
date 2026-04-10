# Services Healthcheck

A self-hosted dashboard for monitoring LLM, embedding, and HTTP services. Runs scheduled health checks via cron, displays results in a web UI, and sends reports to Telegram.

## Deploy with run.sh

Create `.env.local`:

```env
AUTH_USERNAME=admin
AUTH_PASSWORD=your-password
AUTH_SECRET=a-long-random-secret-string
DEGRADED_THRESHOLD_MS=3000
```

Then run:

```bash
bash run.sh --port 3000
```

This builds the Docker image and starts the container. The SQLite database persists in `./data/`. To stop:

```bash
bash down_service.sh
```

## Dev Installation

Requires Node.js 20+ and pnpm.

```bash
pnpm install
# fill in AUTH_USERNAME, AUTH_PASSWORD, AUTH_SECRET in .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).
