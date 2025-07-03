// 使用 pg 模組直接執行 SQL 命令初始化權限系統
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

// 讀取 SQL 腳本內容
function readSqlScript() {
  try {
    const scriptPath = path.resolve(__dirname, './init-permissions.sql');
    if (fs.existsSync(scriptPath)) {
      return fs.readFileSync(scriptPath, 'utf8');
    } else {
      console.error('找不到 SQL 腳本檔案');
      return null;
    }
  } catch (error) {
    console.error('讀取 SQL 腳本失敗:', error);
    return null;
  }
}

// 執行 SQL 命令
async function executeSql(client, sql) {
  try {
    await client.query(sql);
    console.log('SQL 命令執行成功');
    return true;
  } catch (error) {
    console.error('SQL 命令執行失敗:', error);
    return false;
  }
}

// 主函數
async function main() {
  // 載入環境變數
  loadEnv();
  
  // 檢查資料庫連線字串
  if (!process.env.DATABASE_URL) {
    console.error('錯誤: 找不到 DATABASE_URL 環境變數');
    process.exit(1);
  }
  
  console.log('資料庫連線字串:', process.env.DATABASE_URL.substring(0, 20) + '...');
  
  // 讀取 SQL 腳本
  const sqlScript = readSqlScript();
  if (!sqlScript) {
    process.exit(1);
  }
  
  // 建立資料庫連線
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // 連線到資料庫
    console.log('連線到資料庫...');
    await client.connect();
    console.log('已連線到資料庫');
    
    // 執行 SQL 腳本
    console.log('執行 SQL 腳本...');
    const success = await executeSql(client, sqlScript);
    
    if (success) {
      // 檢查結果
      const permCount = await client.query('SELECT COUNT(*) FROM "Permission"');
      const roleCount = await client.query('SELECT COUNT(*) FROM "Role"');
      const rolePerm = await client.query('SELECT COUNT(*) FROM "RolePermission"');
      const userRole = await client.query('SELECT COUNT(*) FROM "UserRole"');
      
      console.log('\n初始化結果:');
      console.log(`- 權限: ${permCount.rows[0].count}`);
      console.log(`- 角色: ${roleCount.rows[0].count}`);
      console.log(`- 角色權限: ${rolePerm.rows[0].count}`);
      console.log(`- 用戶角色: ${userRole.rows[0].count}`);
      
      console.log('\n權限系統初始化完成!');
    }
  } catch (error) {
    console.error('資料庫操作失敗:', error);
  } finally {
    // 關閉資料庫連線
    await client.end();
    console.log('已關閉資料庫連線');
  }
}

// 執行主函數
main();
