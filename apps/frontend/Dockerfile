# ---- 1. Builder Stage: 專注於建置，並精確控制快取 ----
FROM node:18-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN --mount=type=cache,id=pnpm_dev,target=/pnpm/store \
    chown -R node:node /pnpm/store && \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter=frontend... --package-import-method=copy

COPY packages/shared-types/ ./packages/shared-types/
COPY apps/frontend/ ./apps/frontend/

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET

RUN pnpm --filter=frontend... build

# ---- 2. Packager Stage: 建立一個獨立、乾淨的 Production 環境 ----
FROM node:18-alpine AS packager
WORKDIR /app

RUN corepack enable

# 同樣只複製運行 frontend 所需的 package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

# 【優化】再次利用快取，並只安裝 "production" 依賴
RUN --mount=type=cache,id=pnpm_prod,target=/pnpm/store \
    chown -R node:node /pnpm/store && \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --prod --frozen-lockfile --filter=frontend... --package-import-method=copy

# 從 builder stage 複製建置好的產物到這個乾淨的環境中
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist


# ---- 3. Runner Stage: 最終運行的映像檔，追求極致輕量 ----
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 【優化】直接複製 packager stage 準備好的一切，無需任何安裝
COPY --from=packager /app .

# 設定工作目錄
WORKDIR /app/apps/frontend

EXPOSE 8080

CMD ["pnpm", "start"]
