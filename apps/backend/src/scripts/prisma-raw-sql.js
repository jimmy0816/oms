// 使用 Prisma 的 $executeRawUnsafe 方法執行 SQL 命令
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

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

// 將 SQL 腳本分割為單獨的命令
function splitSqlScript(script) {
  // 將 DO $$ ... $$ 塊作為單獨的命令處理
  const doBlocks = [];
  let remainingScript = script;
  
  // 提取所有 DO $$ ... $$ 塊
  const doBlockRegex = /DO \$\$([\s\S]*?)\$\$/g;
  let match;
  
  while ((match = doBlockRegex.exec(script)) !== null) {
    doBlocks.push(`DO $$${match[1]}$$`);
  }
  
  return doBlocks;
}

// 主函數
async function main() {
  // 載入環境變數
  loadEnv();
  
  // 初始化 Prisma 客戶端
  const prisma = new PrismaClient();
  
  try {
    // 讀取 SQL 腳本
    const sqlScript = readSqlScript();
    if (!sqlScript) {
      process.exit(1);
    }
    
    // 分割 SQL 腳本為單獨的命令
    const sqlCommands = splitSqlScript(sqlScript);
    
    console.log(`找到 ${sqlCommands.length} 個 SQL 命令塊`);
    
    // 執行每個 SQL 命令
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      console.log(`執行 SQL 命令塊 ${i + 1}/${sqlCommands.length}...`);
      
      try {
        await prisma.$executeRawUnsafe(command);
        console.log(`SQL 命令塊 ${i + 1} 執行成功`);
      } catch (error) {
        console.error(`SQL 命令塊 ${i + 1} 執行失敗:`, error);
      }
    }
    
    // 檢查結果
    const permissionsResult = await prisma.permission.findMany();
    const rolesResult = await prisma.role.findMany();
    const rolePermissionsResult = await prisma.rolePermission.findMany();
    const userRolesResult = await prisma.userRole.findMany();
    
    console.log('\n初始化結果:');
    console.log(`- 權限表中有 ${permissionsResult.length} 個記錄`);
    console.log(`- 角色表中有 ${rolesResult.length} 個記錄`);
    console.log(`- 角色權限表中有 ${rolePermissionsResult.length} 個記錄`);
    console.log(`- 用戶角色表中有 ${userRolesResult.length} 個記錄`);
    
    console.log('\n權限系統初始化完成!');
  } catch (error) {
    console.error('初始化過程中發生錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 執行主函數
main();
