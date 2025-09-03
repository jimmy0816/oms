# apps/frontend/Dockerfile

# ---- 1. Base ----
# 基礎映像，包含 Node.js 和 pnpm
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# ---- 2. Pruner ----
# 負責從整個 monorepo 中，只提取出建置 frontend 所需的檔案
FROM base AS pruner
WORKDIR /app

# 只複製建構依賴圖譜所需的檔案
COPY turbo.json turbo.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml
COPY package.json package.json

# 複製所有專案的 package.json，以便 turbo 計算依賴
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/prisma-client/package.json packages/prisma-client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

# 複製建置 frontend 所需的原始碼
# 這裡我們只複製 shared-types 和 frontend 的程式碼
COPY packages/shared-types/src packages/shared-types/src
COPY packages/shared-types/tsconfig.json packages/shared-types/tsconfig.json
COPY apps/frontend/src apps/frontend/src
COPY apps/frontend/public apps/frontend/public
COPY apps/frontend/next.config.js apps/frontend/next.config.js
COPY apps/frontend/tsconfig.json apps/frontend/tsconfig.json

# 執行 prune，產生一個只包含 frontend 及其依賴的精簡版 monorepo
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=frontend... build

# ---- 3. Runner ----
# 最終執行環境，非常輕量
FROM base AS runner
WORKDIR /app

# 設定環境變數
ENV NODE_ENV=production

# 從 Pruner 階段複製建置好的 standalone 輸出
# 這需要你在 next.config.js 中設定 output: 'standalone'
COPY --from=pruner /app/apps/frontend/.next/standalone ./
COPY --from=pruner /app/apps/frontend/.next/static ./.next/static

# 暴露端口
EXPOSE 8080

# 啟動伺服器
CMD node server.js