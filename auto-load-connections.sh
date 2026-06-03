#!/bin/bash
# Auto-load connections into Supabase using REST API
# Run: bash auto-load-connections.sh

# Get credentials from config.js or environment
URL="${VITE_SUPABASE_URL:-https://ulluacifirzywhmzkvkr.supabase.co}"
KEY="${VITE_SUPABASE_ANON_KEY:-sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C}"

echo "🔗 Loading connections into Supabase..."
echo "URL: $URL"

# SQL to insert all 25 connections
SQL="INSERT INTO connections (source_id, target_id, connection_type, historical_period) VALUES
(13, 41, 'colleague', 'unknown'),
(24, 242, 'colleague', 'unknown'),
(27, 25, 'colleague', 'unknown'),
(31, 232, 'colleague', 'unknown'),
(32, 41, 'colleague', 'unknown'),
(36, 229, 'colleague', 'unknown'),
(37, 3, 'colleague', 'unknown'),
(41, 25, 'colleague', 'unknown'),
(43, 47, 'colleague', 'unknown'),
(43, 41, 'colleague', 'unknown'),
(44, 41, 'colleague', 'unknown'),
(50, 41, 'colleague', 'unknown'),
(51, 41, 'colleague', 'unknown'),
(60, 41, 'colleague', 'unknown'),
(109, 106, 'colleague', 'unknown'),
(114, 250, 'colleague', 'unknown'),
(146, 154, 'colleague', 'unknown'),
(146, 137, 'colleague', 'unknown'),
(148, 169, 'colleague', 'unknown'),
(151, 148, 'colleague', 'unknown'),
(153, 41, 'colleague', 'unknown'),
(162, 41, 'colleague', 'unknown'),
(162, 20, 'colleague', 'unknown'),
(184, 229, 'colleague', 'unknown'),
(185, 232, 'colleague', 'unknown') ON CONFLICT DO NOTHING;"

# Execute via REST API
RESPONSE=$(curl -s -X POST \
  "$URL/rest/v1/rpc/exec_sql" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": $(echo "$SQL" | jq -Rs .)}")

echo "✅ Response: $RESPONSE"
echo "🎉 Done! Refresh your site to see the connections."
