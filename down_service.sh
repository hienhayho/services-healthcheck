#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="services-healthcheck"

if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "⚠️  Container '$CONTAINER_NAME' not found."
  exit 0
fi

echo "🛑 Stopping and removing container: $CONTAINER_NAME"
docker rm -f "$CONTAINER_NAME"
echo "✅ Done."
