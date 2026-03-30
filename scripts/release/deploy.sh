#!/usr/bin/env bash
set -euo pipefail

# Deploy a service to Railway
# Usage: bash scripts/release/deploy.sh <api|web> [message]

SERVICE="${1:?Usage: deploy.sh <api|web> [message]}"
MESSAGE="${2:-Deploy $SERVICE}"

case "$SERVICE" in
  api)
    cat > railway.json <<'EOF'
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "apps/api/Dockerfile" },
  "deploy": { "healthcheckPath": "/health" }
}
EOF
    ;;
  web)
    cat > railway.json <<'EOF'
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "apps/web/Dockerfile" },
  "deploy": {}
}
EOF
    ;;
  docs)
    cat > railway.json <<'EOF'
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "apps/docs/Dockerfile" },
  "deploy": {}
}
EOF
    ;;
  *)
    echo "Unknown service: $SERVICE (expected api, web, or docs)" >&2
    exit 1
    ;;
esac

echo "Deploying $SERVICE..."
railway up --service "$SERVICE" --ci -m "$MESSAGE"
