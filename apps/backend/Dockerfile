# 使用多階段構建，解決 pnpm 和 Prisma 的問題
FROM node:18.18-alpine AS builder
WORKDIR /app

# 設置環境變數以避免 react-native.js 的問題
ENV PRISMA_CLIENT_ENGINE_TYPE=binary
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/oms

# 安裝必要的套件和全局工具
RUN apk add --no-cache postgresql-client openssl
RUN npm install -g pnpm

# 複製所有 package.json 和 workspace 配置
# 這是為了讓 pnpm 能夠正確解析所有依賴
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/prisma-client/package.json ./packages/prisma-client/
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --production=false

# 複製所有源代碼
COPY . .

# 建立 shared-types 包
RUN pnpm --filter shared-types build

# 生成 Prisma 客戶端
RUN pnpm --filter prisma-client db:generate

# 建立 prisma-client 包
RUN pnpm --filter prisma-client build

# 構建 backend 應用
RUN pnpm --filter backend build

# 運行階段
FROM node:18-alpine3.15 AS runner
WORKDIR /app

# 安裝 PostgreSQL 客戶端和 OpenSSL 依賴
RUN apk add --no-cache postgresql-client openssl

# 複製所有的 package.json 和 pnpm-lock.yaml，以便 pnpm 能正確識別 workspace 結構
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# 複製各個 packages 的 package.json，確保 pnpm 的 workspace 結構完整
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/prisma-client/package.json ./packages/prisma-client/package.json
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

RUN npm install -g pnpm
RUN pnpm install --prod

# 複製構建輸出
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
COPY --from=builder /app/packages/prisma-client/dist ./packages/prisma-client/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# COPY --from=builder /app/node_modules/.pnpm /app/node_modules/.pnpm
# COPY --from=builder /app/packages/prisma-client/node_modules/.prisma /app/node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/node_modules/.prisma
COPY --from=builder /app/node_modules /app/node_modules

# 設置環境變數
ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/oms

# 暴露端口
EXPOSE 8080

# 將工作目錄設置為後端應用目錄
WORKDIR /app/apps/backend

# 啟動應用
CMD ["npx", "next", "start", "-p", "8080"]
