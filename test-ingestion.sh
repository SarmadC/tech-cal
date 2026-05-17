#!/bin/bash
set -euo pipefail
# Test ingestion trigger script

# Export a valid browser session cookie before running:
# export INGESTION_COOKIE='__next_hmr_refresh_hash__=...; sb-...'
COOKIE="${INGESTION_COOKIE:-}"
if [[ -z "$COOKIE" ]]; then
  echo "Missing INGESTION_COOKIE environment variable"
  exit 1
fi

# Trigger ingestion for all active sources
echo "Triggering ingestion for all active sources..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:3000/api/admin/ingestion/run" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{}')

# Extract HTTP status and body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo ""
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
