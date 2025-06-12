# 構建階段
FROM node:18-alpine AS builder
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package.json 和 workspace 配置
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/frontend/package.json ./apps/frontend/

# 安裝依賴
RUN pnpm install --frozen-lockfile

# 複製源代碼
COPY . .

# 建立 shared-types 包
RUN cd packages/shared-types && pnpm build

# 構建應用（使用 Edge Runtime）
RUN cd apps/frontend && NEXT_RUNTIME=edge npx next build

# 運行階段
FROM node:18-alpine AS runner
WORKDIR /app

# 安裝生產依賴
RUN npm install -g pnpm
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/
RUN pnpm install --prod --frozen-lockfile

# 複製構建輸出
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
# 創建 public 目錄
RUN mkdir -p /app/apps/frontend/public
# 複製必要的依賴
COPY --from=builder /app/node_modules ./node_modules

# 設置環境變數
ENV NODE_ENV=production
ENV NEXT_RUNTIME=edge
ENV PORT=8080

# 暴露端口
EXPOSE 8080

# 啟動應用
WORKDIR /app/apps/frontend
CMD ["npx", "next", "start", "-p", "8080"]
