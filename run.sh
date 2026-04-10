#!/usr/bin/env bash
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
PORT=3000
IMAGE_NAME="services-healthcheck"
CONTAINER_NAME="services-healthcheck"
DATA_DIR="$(pwd)/data"

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"
      shift 2
      ;;
    --port=*)
      PORT="${1#*=}"
      shift
      ;;
    --help|-h)
      echo "Usage: ./run.sh [--port <port>]"
      echo ""
      echo "Options:"
      echo "  --port <port>   Port to run on (default: 3000)"
      echo ""
      echo "Environment variables (loaded from .env.local if present):"
      echo "  AUTH_USERNAME        Login username"
      echo "  AUTH_PASSWORD        Login password"
      echo "  AUTH_SECRET          JWT signing secret (use a long random string)"
      echo "  DEGRADED_THRESHOLD_MS  Latency threshold for degraded status (default: 3000)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run './run.sh --help' for usage."
      exit 1
      ;;
  esac
done

# ── Load .env.local if present ────────────────────────────────────────────────
ENV_FILE=".env.local"
ENV_ARGS=()

if [[ -f "$ENV_FILE" ]]; then
  echo "📄 Loading environment from $ENV_FILE"
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    ENV_ARGS+=(--env "$line")
  done < "$ENV_FILE"
fi

# ── Validate required env vars ────────────────────────────────────────────────
REQUIRED_VARS=("AUTH_USERNAME" "AUTH_PASSWORD" "AUTH_SECRET")
MISSING=()

for var in "${REQUIRED_VARS[@]}"; do
  # Check env var directly or from .env.local lines collected above
  val="${!var:-}"
  if [[ -z "$val" ]]; then
    # Try to find it in the env args we parsed
    for arg in "${ENV_ARGS[@]}"; do
      if [[ "$arg" == ${var}=* ]]; then
        val="${arg#*=}"
        break
      fi
    done
  fi
  if [[ -z "$val" ]]; then
    MISSING+=("$var")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "❌ Missing required environment variables:"
  for var in "${MISSING[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "Set them in .env.local or export them before running."
  exit 1
fi

# ── Build image ───────────────────────────────────────────────────────────────
echo "🔨 Building Docker image: $IMAGE_NAME"
docker build --no-cache -t "$IMAGE_NAME" .

# ── Stop & remove existing container ─────────────────────────────────────────
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "🛑 Stopping existing container: $CONTAINER_NAME"
  docker rm -f "$CONTAINER_NAME" > /dev/null
fi

# ── Create data directory with correct ownership ──────────────────────────────
mkdir -p "$DATA_DIR"
# Container runs as UID 1001 (nextjs). Ensure the host dir is writable by that user.
chown 1001:1001 "$DATA_DIR" 2>/dev/null || true

# ── Run container ─────────────────────────────────────────────────────────────
echo "🚀 Starting container on port $PORT"

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "${PORT}:3000" \
  -v "${DATA_DIR}:/app/data" \
  "${ENV_ARGS[@]}" \
  "$IMAGE_NAME"

echo ""
echo "✅ Running at http://localhost:${PORT}"
echo ""
echo "Useful commands:"
echo "  docker logs -f $CONTAINER_NAME   # stream logs"
echo "  docker stop $CONTAINER_NAME      # stop"
echo "  docker rm $CONTAINER_NAME        # remove"
