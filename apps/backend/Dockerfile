# ---- 1. Builder Stage: 專注於建置，並精確控制快取 ----
FROM node:18-alpine AS builder
WORKDIR /app

# 1. 使用 Corepack 管理 pnpm (Node.js 內建，比 npm -g 更好)
RUN corepack enable

# 2. 僅複製建置 backend 所需的 package manifests
# 這樣只有在這些檔案變更時，才會重新安裝依賴
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/prisma-client/package.json ./packages/prisma-client/
COPY packages/shared-types/package.json ./packages/shared-types/

# 3. 只安裝 backend 及其依賴項目的 production dependencies
# --prod: 避免安裝 devDependencies
# --filter: pnpm monorepo 的精髓，只處理指定專案及其依賴
RUN pnpm install --prod --frozen-lockfile --filter=backend...

# 4. 複製所有原始碼 (現在依賴已經安裝完畢)
# 將原始碼複製步驟放在 'pnpm install' 之後，最大化利用快取
COPY . .

# 設定 Prisma 引擎類型
ENV PRISMA_CLIENT_ENGINE_TYPE=binary

# 5. 依序執行建置
# 這裡我們利用 pnpm 的依賴圖來自動建置，更簡潔
RUN pnpm --filter=backend... build


# ---- 2. Runner Stage: 最終運行的映像檔，追求極致輕量 ----
FROM node:18-alpine AS runner
WORKDIR /app

# 安裝 runtime 需要的最小依賴
RUN apk add --no-cache openssl

# 7. 從 builder stage 複製必要的產物
# backend 的 package.json 是為了讓 next start 能正確找到啟動腳本
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
COPY --from=builder /app/apps/backend/public ./apps/backend/public
COPY --from=builder /app/node_modules ./node_modules

# 設定工作目錄
WORKDIR /app/apps/backend

# Cloud Run 會自動注入 PORT 環境變數，Next.js 會自動讀取
EXPOSE 8080

# 9. 使用 pnpm 啟動，更符合 monorepo 的習慣
# 請確保 backend/package.json 中有 "start": "next start"
CMD ["npx", "next", "start"]
