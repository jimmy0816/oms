// 執行 SQL 腳本的輔助程式
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 讀取環境變數
function loadEnv() {
  try {
    // 嘗試讀取 .env.development 檔案
    const envPath = path.resolve(__dirname, '../../.env.development');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      envLines.forEach(line => {
        const match = line.match(/^\s*(\w+)\s*=\s*(.*)\s*$/);
        if (match) {
          const key = match[1];
          const value = match[2].replace(/^['"](.*)['"]/g, '$1'); // 移除引號
          process.env[key] = value;
        }
      });
      
      console.log('已載入環境變數');
    } else {
      console.log('找不到 .env.development 檔案');
    }
  } catch (error) {
    console.error('載入環境變數失敗:', error);
  }
}

// 從資料庫連線字串解析連線資訊
function parseConnectionString(connectionString) {
  try {
    // 格式: postgresql://username:password@hostname:port/database
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = connectionString.match(regex);
    
    if (match) {
      return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: match[4],
        database: match[5]
      };
    } else {
      throw new Error('無法解析資料庫連線字串');
    }
  } catch (error) {
    console.error('解析連線字串失敗:', error);
    return null;
  }
}

// 執行 SQL 腳本
function executeSqlScript(scriptPath, connectionInfo) {
  return new Promise((resolve, reject) => {
    if (!connectionInfo) {
      reject(new Error('缺少資料庫連線資訊'));
      return;
    }
    
    // 建立 PGPASSWORD 環境變數以避免密碼提示
    const env = { ...process.env, PGPASSWORD: connectionInfo.password };
    
    // 建立 psql 命令
    const command = `psql -h ${connectionInfo.host} -p ${connectionInfo.port} -U ${connectionInfo.user} -d ${connectionInfo.database} -f "${scriptPath}"`;
    
    console.log(`執行 SQL 腳本: ${scriptPath}`);
    console.log(`連線到資料庫: ${connectionInfo.host}:${connectionInfo.port}/${connectionInfo.database} (用戶: ${connectionInfo.user})`);
    
    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`執行 SQL 腳本失敗: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.log(`SQL 腳本輸出 (stderr): ${stderr}`);
      }
      
      console.log(`SQL 腳本輸出: ${stdout}`);
      resolve(stdout);
    });
  });
}

// 主函數
async function main() {
  try {
    // 載入環境變數
    loadEnv();
    
    // 檢查資料庫連線字串
    if (!process.env.DATABASE_URL) {
      console.error('錯誤: 找不到 DATABASE_URL 環境變數');
      process.exit(1);
    }
    
    console.log('資料庫連線字串:', process.env.DATABASE_URL.substring(0, 20) + '...');
    
    // 解析連線字串
    const connectionInfo = parseConnectionString(process.env.DATABASE_URL);
    
    if (!connectionInfo) {
      console.error('無法解析資料庫連線資訊');
      process.exit(1);
    }
    
    // SQL 腳本路徑
    const scriptPath = path.resolve(__dirname, './init-permissions.sql');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`找不到 SQL 腳本: ${scriptPath}`);
      process.exit(1);
    }
    
    // 執行 SQL 腳本
    await executeSqlScript(scriptPath, connectionInfo);
    
    console.log('SQL 腳本執行完成');
  } catch (error) {
    console.error('執行過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 執行主函數
main();
