#!/usr/bin/env bash
# Deploys the current "staging" branch to Vercel (Preview) and points the fixed
# staging address at it. Staging uses its own database and settings (Vercel env
# vars scoped to the "staging" branch), never the production data.
#
#   bash scripts/deploy-staging.sh
set -euo pipefail

STAGING_ALIAS="crm-coaching-staging.vercel.app"

branch="$(git branch --show-current)"
if [ "$branch" != "staging" ]; then
  echo "✗ Switch to the staging branch first (current: $branch)." >&2
  exit 1
fi

echo "→ Deploying branch staging to Vercel (Preview)…"
url="$(npx vercel deploy --yes 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | head -1)"
if [ -z "$url" ]; then
  echo "✗ Deployment failed — run 'npx vercel deploy' to see the error." >&2
  exit 1
fi

echo "→ Pointing https://$STAGING_ALIAS to $url"
npx vercel alias set "$url" "$STAGING_ALIAS" >/dev/null
echo "✓ Staging is live: https://$STAGING_ALIAS (Vercel login required)"
