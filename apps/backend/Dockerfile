# 構建階段
FROM node:18-alpine AS builder
WORKDIR /app

# 安裝 pnpm 和 PostgreSQL 客戶端
RUN apk add --no-cache postgresql-client openssl # 合併安裝 openssl
RUN npm install -g pnpm

# 複製所有 package.json 和 workspace 配置
# 這是為了讓 pnpm 能夠正確解析所有依賴
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/prisma-client/package.json ./packages/prisma-client/
COPY apps/backend/package.json ./apps/backend/

# 安裝所有依賴
RUN pnpm install # 只需要生產依賴，或者 pnpm install

# 複製所有源代碼
COPY . .

# 建立 shared-types 包
RUN pnpm --filter shared-types build # 使用 pnpm run build 運行 workspace 內的 build script

# 生成 Prisma 客戶端
# 確保在 Prisma 客戶端使用的所有依賴都已安裝
# 這裡應該確保 schema.prisma 檔案存在於正確的路徑
# RUN pnpm --filter prisma-client prisma generate # 使用 pnpm run prisma generate
# RUN ls -lR /app/packages/prisma-client/node_modules/.prisma # 檢查子專案的 .prisma

RUN pnpm --filter prisma-client db:generate
# 建立 prisma-client 包
RUN pnpm --filter prisma-client build # 使用 pnpm run build 運行 workspace 內的 build script

# 構建 backend 應用
RUN pnpm --filter backend build

# 運行階段
FROM node:18-alpine3.15 AS runner
WORKDIR /app

# 安裝 PostgreSQL 客戶端和 OpenSSL 依賴
RUN apk add --no-cache postgresql-client openssl

# 從 builder 階段複製 production node_modules
# COPY --from=builder /app/node_modules ./node_modules
# 複製所有的 package.json 和 pnpm-lock.yaml，以便 pnpm 能正確識別 workspace 結構
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# 複製各個 packages 的 package.json，確保 pnpm 的 workspace 結構完整
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/prisma-client/package.json ./packages/prisma-client/package.json
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

RUN npm install -g pnpm # 確保 pnpm 在 runner 階段可用
RUN pnpm install --prod # 重新安裝生產依賴

# 複製構建輸出
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
COPY --from=builder /app/packages/prisma-client/dist ./packages/prisma-client/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# RUN cd /app/packages/prisma-client && pnpm run build
# COPY --from=builder /app/packages/prisma-client/prisma ./packages/prisma-client/prisma
# 確保 Prisma 客戶端運行時所需的 engine 檔案被複製
COPY --from=builder /app/packages/prisma-client/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/packages/prisma-client/node_modules/.prisma ./node_modules/.prisma

# 設置環境變數
ENV NODE_ENV=production
ENV PORT=8080

# 暴露端口
EXPOSE 8080

# 啟動應用
WORKDIR /app/apps/backend
CMD ["npx", "next", "start", "-p", "8080"]
