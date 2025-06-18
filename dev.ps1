# PowerShell 腳本用於 Windows 環境下啟動開發環境

# 檢查是否安裝了 pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "pnpm 未安裝，正在安裝..."
    npm install -g pnpm
}

# 安裝依賴
Write-Host "安裝依賴..."
pnpm install

# 設置環境變數
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/oms"
$env:JWT_SECRET = "local_development_secret"

# 生成 Prisma 客戶端
Write-Host "生成 Prisma 客戶端..."
Push-Location packages\prisma-client
npx prisma generate
Pop-Location

# 啟動後端和前端服務
Write-Host "啟動開發環境..."
Start-Process -NoNewWindow powershell -ArgumentList "-Command", "Set-Location '$pwd\apps\backend'; pnpm dev"
Start-Process -NoNewWindow powershell -ArgumentList "-Command", "Set-Location '$pwd\apps\frontend'; pnpm dev"

# 顯示訪問信息
Write-Host "開發環境已啟動"
Write-Host "前端: http://localhost:3000"
Write-Host "後端: http://localhost:3001"
Write-Host "按 Ctrl+C 停止所有服務 (需要手動關閉啟動的 PowerShell 視窗)"

# 保持腳本運行
Read-Host "按 Enter 鍵結束此腳本 (不會關閉服務)"
