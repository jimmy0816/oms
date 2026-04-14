# ==========================================
# 部署通知腳本 (Deployment Notifier Worker)
# 參考: thehapp-coffee (https://deployment-notifier.j-3f8.workers.dev)
# ==========================================

SERVICE_NAME=$1
STATUS=$2
WORKER_URL=$3
ENABLED=$4
COMMIT_SHA=$5
PROJECT_ID=$6
REPO_NAME=$7
APP_ENV=$8

if [ "$ENABLED" != "true" ] || [ -z "$WORKER_URL" ]; then
  echo "[Notify] Notification disabled or Webhook URL missing. Skipping..."
  exit 0
fi

echo "[Notify] Sending ${STATUS} notification for ${SERVICE_NAME} to Worker..."

# 構建 Worker 預期的 JSON 格式 (參考 thehapp-coffee)
# 我們在原有的 schema 上加入了 service 以適應 Monorepo
PAYLOAD=$(cat <<EOF
{
  "platform": "github",
  "repo_slug": "${REPO_NAME:-jimmy0816/oms}",
  "commit": "${COMMIT_SHA}",
  "env": "${APP_ENV:-production}",
  "service": "${SERVICE_NAME}",
  "status": "${STATUS}",
  "trigger_by": "Cloud Build",
  "project_id": "${PROJECT_ID}"
}
EOF
)

# 發送經由 curl
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$WORKER_URL")

if [ "$RESPONSE" == "200" ]; then
  echo "[Notify] Notification sent successfully."
else
  echo "[Notify] Failed to send notification. HTTP Status: $RESPONSE"
  exit 0
fi
