#!/usr/bin/env bash
# Run ON YOUR MAC after: vercel login
# Usage: bash scripts/set-vercel-env.sh
set -euo pipefail
cd "$(dirname "$0")/.."

vercel whoami >/dev/null 2>&1 || {
  echo "Run: vercel login"
  exit 1
}

if [[ ! -d .vercel ]]; then
  echo "Link this folder to your Vercel project:"
  echo "  vercel link"
  exit 1
fi

DISPATCH_URL="https://delivery-dispatch-mvp.onrender.com"

echo "Adding DELIVERY_API_BASE_URL (production)..."
printf '%s' "$DISPATCH_URL" | vercel env add DELIVERY_API_BASE_URL production

echo ""
echo "Paste STORE_WEBHOOK_SECRET from Render (input hidden):"
read -rs SECRET
echo ""
if [[ -z "${SECRET}" ]]; then
  echo "Empty secret, aborting."
  exit 1
fi
printf '%s' "$SECRET" | vercel env add DELIVERY_WEBHOOK_SECRET production

echo ""
echo "Done. Redeploy: vercel --prod"
