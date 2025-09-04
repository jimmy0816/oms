# ---- 1. Builder Stage: 專注於建置，並精確控制快取 ----
FROM node:18-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/prisma-client/package.json ./packages/prisma-client/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    chown -R node:node /pnpm/store && \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter=backend...

COPY packages/prisma-client/ ./packages/prisma-client/
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/backend/ ./apps/backend/

ENV PRISMA_CLIENT_ENGINE_TYPE=binary

RUN pnpm --filter=backend... build

FROM node:18-alpine AS packager
WORKDIR /app

RUN corepack enable

# 【修正點】在這裡補上複製 pnpm-lock.yaml
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/packages/prisma-client/package.json ./packages/prisma-client/
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    chown -R node:node /pnpm/store && \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --prod --frozen-lockfile --filter=backend...

COPY --from=builder /app/node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/ ./node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/

# 從 builder stage 複製建置好的產物到這個乾淨的環境中
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
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
