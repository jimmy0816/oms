# 使用單階段構建，避免 pnpm 和 Prisma 的問題
FROM node:18.18-alpine
WORKDIR /app

# 設置環境變數以避免 react-native.js 的問題
ENV PRISMA_CLIENT_ENGINE_TYPE=binary
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/oms

# 安裝必要的套件和全局工具
RUN apk add --no-cache postgresql-client openssl
RUN npm install -g typescript prisma

# 複製 shared-types 包的源代碼
COPY packages/shared-types /app/packages/shared-types

# 建立 shared-types 包
RUN cd /app/packages/shared-types && npm install && npm run build

# 複製 prisma-client 包的源代碼
COPY packages/prisma-client /app/packages/prisma-client

# 安裝 prisma-client 依賴並生成 Prisma 客戶端
RUN cd /app/packages/prisma-client && \
    npm install && \
    npm install --save-dev @types/node && \
    npx prisma generate --schema=./prisma/schema.prisma && \
    npm run build

# 複製後端應用的源代碼
COPY apps/backend /app/apps/backend

# 安裝後端應用依賴並構建應用
RUN cd /app/apps/backend && \
    npm install && \
    mkdir -p /app/apps/backend/node_modules/.prisma && \
    cp -r /app/packages/prisma-client/node_modules/.prisma/client /app/apps/backend/node_modules/.prisma/ && \
    cp /app/packages/prisma-client/prisma/schema.prisma /app/apps/backend/node_modules/.prisma/client/ && \
    npm run build

# 確保在運行時也能找到 schema.prisma 文件
RUN mkdir -p /app/node_modules/.prisma/client && \
    cp /app/packages/prisma-client/prisma/schema.prisma /app/node_modules/.prisma/client/

# 暴露端口
EXPOSE 3001

# 將工作目錄設置為後端應用目錄
WORKDIR /app/apps/backend

# 啟動應用
CMD ["npx", "next", "start", "-p", "3001"]
