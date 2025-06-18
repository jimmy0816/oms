#!/bin/bash

# 檢查是否安裝了 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "pnpm 未安裝，正在安裝..."
    npm install -g pnpm
fi

# 安裝依賴
echo "安裝依賴..."
pnpm install

# 設置環境變數
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oms"
export JWT_SECRET="local_development_secret"

# 檢查 PostgreSQL 是否運行
echo "檢查 PostgreSQL 是否運行..."
if ! pg_isready -h localhost -p 5432 -U postgres &> /dev/null; then
    echo "PostgreSQL 未運行，請確保 PostgreSQL 已啟動"
    echo "您可以使用 docker-compose up db 啟動 PostgreSQL"
    exit 1
fi

# 生成 Prisma 客戶端
echo "生成 Prisma 客戶端..."
cd packages/prisma-client
npx prisma generate
cd ../..

# 啟動後端
echo "啟動後端服務..."
cd apps/backend
pnpm dev &
BACKEND_PID=$!
cd ../..

# 等待後端啟動
echo "等待後端服務啟動..."
sleep 5

# 啟動前端
echo "啟動前端服務..."
cd apps/frontend
pnpm dev &
FRONTEND_PID=$!
cd ../..

# 捕獲 Ctrl+C 信號
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

# 保持腳本運行
echo "開發環境已啟動"
echo "前端: http://localhost:3000"
echo "後端: http://localhost:3001"
echo "按 Ctrl+C 停止所有服務"
wait
