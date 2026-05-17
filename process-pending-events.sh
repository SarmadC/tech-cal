#!/bin/bash
set -euo pipefail
# Process pending events in batches

# Export a valid browser session cookie before running:
# export INGESTION_COOKIE='__next_hmr_refresh_hash__=...; sb-...'
COOKIE="${INGESTION_COOKIE:-}"
if [[ -z "$COOKIE" ]]; then
  echo "Missing INGESTION_COOKIE environment variable"
  exit 1
fi

echo "Processing pending events with higher limit..."
echo ""

# Process with limit of 500 (instead of default 100)
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:3000/api/admin/ingestion/run" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"limit": 500}')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo ""
echo "Normalization Summary:"
echo "$BODY" | jq '.summary.normalization' 2>/dev/null || echo "$BODY"
