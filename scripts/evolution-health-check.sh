#!/bin/bash
# Health monitor for Evolution API container
# Runs every 30s via cron. Restarts the container if unresponsive for 2 consecutive checks.
# Designed for Dokploy-managed deployments — non-invasive, just pings + restart.

set -e

CONTAINER_NAME="kamtech-evolutionapi-d2tsfh-evolution-api-1"
CHECK_URL="https://evolutionapi.kamtech.online/instance/connectionState/kamtech"
FLAG_FILE="/tmp/evo-health-fail"

# Read API key from the running container's environment
API_KEY=$(sudo docker exec "$CONTAINER_NAME" sh -c 'echo $AUTHENTICATION_API_KEY' 2>/dev/null || echo "")
if [ -z "$API_KEY" ]; then
  logger -t evo-health "Cannot read Evolution API key from container — container may be down"
  exit 0
fi

# Quick health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $API_KEY" \
  --connect-timeout 5 \
  --max-time 10 \
  "$CHECK_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  rm -f "$FLAG_FILE"
  exit 0
fi

# Second consecutive failure → restart
if [ -f "$FLAG_FILE" ]; then
  logger -t evo-health "Evolution API down for 2 checks (HTTP $HTTP_CODE). Restarting..."
  sudo docker restart "$CONTAINER_NAME" 2>/dev/null || true
  sleep 3
  sudo docker exec "$CONTAINER_NAME" sh -c 'echo "Health-check triggered restart complete"' 2>/dev/null || true
  rm -f "$FLAG_FILE"
else
  touch "$FLAG_FILE"
  logger -t evo-health "Evolution API unresponsive (HTTP $HTTP_CODE). Will retry..."
fi
