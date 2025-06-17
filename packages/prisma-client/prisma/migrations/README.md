# 資料庫遷移指南

本文件說明如何使用 Prisma 進行資料庫遷移，特別是針對 Google Cloud SQL 環境。

## 遷移流程

### 1. 開發環境遷移

在開發過程中，當您修改了 `schema.prisma` 檔案後，執行以下命令創建新的遷移：

```bash
npx prisma migrate dev --name 遷移名稱
```

例如：`npx prisma migrate dev --name add_user_profile`

### 2. 生產環境遷移

在部署到生產環境前，使用以下命令應用所有待處理的遷移：

```bash
npx prisma migrate deploy
```

### 3. 資料庫連接

確保在運行遷移前設置正確的 `DATABASE_URL` 環境變數：

```
# 直接連接 (需要設置防火牆規則)
DATABASE_URL="postgresql://postgres:your_password_here@34.81.100.202:5432/oms?sslmode=require"

# 或使用 Cloud SQL Proxy (推薦用於生產環境)
DATABASE_URL="postgresql://postgres:your_password_here@localhost:5432/oms?host=/cloudsql/treerful-200611:asia-east1:oms"
```

## Cloud SQL Proxy 設置

在 Google Cloud Run 中，建議使用 Cloud SQL Auth Proxy 進行連接。在部署時添加以下環境變數：

```
INSTANCE_CONNECTION_NAME=treerful-200611:asia-east1:oms
```

並在服務配置中添加 Cloud SQL 連接。
