# 構建階段
FROM node:18-alpine AS builder
WORKDIR /app

# 安裝 pnpm 和 PostgreSQL 客戶端
RUN apk add --no-cache postgresql-client
RUN npm install -g pnpm

# 複製 package.json 和 workspace 配置
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/prisma-client/package.json ./packages/prisma-client/
COPY apps/backend/package.json ./apps/backend/

# 安裝依賴
RUN pnpm install

# 複製源代碼
COPY . .

# 安裝 TypeScript
RUN npm install -g typescript

# 清除 node_modules 並重新安裝依賴
RUN rm -rf node_modules
RUN pnpm install

# 安裝 OpenSSL 依賴
RUN apk add --no-cache openssl

# 建立 shared-types 包
RUN cd packages/shared-types && tsc

# 生成 Prisma 客戶端
RUN cd packages/prisma-client && npx prisma generate --schema=./prisma/schema.prisma

# 建立 prisma-client 包
RUN cd packages/prisma-client && tsc

# 構建後端應用
RUN cd apps/backend && pnpm next build

# 運行階段
# 使用較舊的 Alpine 版本，其中包含 OpenSSL 1.1
FROM node:18-alpine3.15 AS runner
WORKDIR /app

# 安裝 PostgreSQL 客戶端和 OpenSSL 依賴
RUN apk add --no-cache postgresql-client openssl

# 安裝生產依賴
RUN npm install -g pnpm
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/prisma-client/package.json ./packages/prisma-client/
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
RUN pnpm install --prod

# 複製構建輸出
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
COPY --from=builder /app/packages/prisma-client/prisma ./packages/prisma-client/prisma
COPY --from=builder /app/packages/prisma-client/node_modules/.prisma ./packages/prisma-client/node_modules/.prisma

# 確保 Prisma 客戶端可以被正確導入
COPY --from=builder /app/packages/prisma-client/node_modules/.prisma ./apps/backend/node_modules/@prisma/client
RUN mkdir -p ./apps/backend/node_modules/.prisma
COPY --from=builder /app/packages/prisma-client/node_modules/.prisma ./apps/backend/node_modules/.prisma

# 複製必要的依賴
COPY --from=builder /app/node_modules ./node_modules

# 設置環境變數
ENV NODE_ENV=production
ENV PORT=8080

# 暴露端口
EXPOSE 8080

# 啟動應用
WORKDIR /app/apps/backend
CMD ["npx", "next", "start", "-p", "8080"]
