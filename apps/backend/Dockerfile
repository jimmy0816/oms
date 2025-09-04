# ---- 1. Builder Stage: 專注於建置，並精確控制快取 ----
FROM node:18-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/prisma-client/package.json ./packages/prisma-client/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile --filter=backend...

# 3. 只安裝 backend 及其依賴項目的 production dependencies
# --prod: 避免安裝 devDependencies
# --filter: pnpm monorepo 的精髓，只處理指定專案及其依賴
RUN pnpm install --frozen-lockfile --filter=backend...

# 4. 複製所有原始碼 (現在依賴已經安裝完畢)
# 將原始碼複製步驟放在 'pnpm install' 之後，最大化利用快取
COPY . .

# 設定 Prisma 引擎類型
ENV PRISMA_CLIENT_ENGINE_TYPE=binary

# 5. 依序執行建置
# 這裡我們利用 pnpm 的依賴圖來自動建置，更簡潔
RUN pnpm --filter=backend... build

FROM node:18-alpine AS packager
WORKDIR /app

RUN corepack enable

# 只複製運行 backend 所需的 package.json
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/packages/prisma-client/package.json ./packages/prisma-client/
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/

# 【關鍵】只安裝 Production 依賴
# 因為我們只複製了相關的 package.json，pnpm 會建立一個乾淨的、只含 production 依賴的 node_modules
RUN pnpm install --prod --frozen-lockfile --filter=backend...

# 從 builder stage 複製建置好的產物到這個乾淨的環境中
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
COPY --from=builder /app/apps/backend/public ./apps/backend/public
COPY --from=builder /app/packages/prisma-client/dist ./packages/prisma-client/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# ---- 2. Runner Stage: 最終運行的映像檔，追求極致輕量 ----
FROM node:18-alpine AS runner
WORKDIR /app

# 安裝 runtime 需要的最小依賴
RUN apk add --no-cache openssl

COPY --from=packager /app .

# 設定工作目錄
WORKDIR /app/apps/backend

# Cloud Run 會自動注入 PORT 環境變數，Next.js 會自動讀取
EXPOSE 8080

# 9. 使用 pnpm 啟動，更符合 monorepo 的習慣
# 請確保 backend/package.json 中有 "start": "next start"
CMD ["npx", "next", "start"]
