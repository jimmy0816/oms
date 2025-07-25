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
RUN pnpm install

# 複製源代碼
COPY . .

# 安裝 TypeScript
RUN npm install -g typescript

# 清除 node_modules 並重新安裝依賴
RUN rm -rf node_modules
RUN pnpm install

# 建立 shared-types 包
RUN cd packages/shared-types && tsc

# 安裝 Next.js 構建所需的 TypeScript 依賴
RUN cd apps/frontend && pnpm add -D typescript@5.2.2 @types/react@18.2.21 @types/node@20.8.10

# 設置 Docker 構建環境變數
ENV DOCKER_BUILD=true

# --- START MODIFICATION ---
# 1. 定義一個建置參數，用於接收來自 Cloud Build 的 API URL
ARG NEXT_PUBLIC_API_URL

# 2. 將這個建置參數設定為環境變數，供 Next.js 建置時使用
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# --- END MODIFICATION ---

# 只移除 disabled 目錄，保留 tickets 目錄
RUN rm -rf apps/frontend/src/pages/disabled

# 構建應用
ENV NEXT_SKIP_TYPE_CHECK=1
# 這裡的 NEXT_PUBLIC_API_URL 現在會是從 ARG 傳入的正確值
RUN cd apps/frontend && pnpm next build --no-lint

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
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
# 複製必要的依賴
COPY --from=builder /app/node_modules ./node_modules

# 設置環境變數
ENV NODE_ENV=production
ENV PORT=8080
# 確保運行時環境也有這個變數，以防 SSR 時需要
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 暴露端口
EXPOSE 8080

# 啟動應用
WORKDIR /app/apps/frontend
CMD ["npx", "next", "start", "-p", "8080"]
