// 檢查權限系統是否已成功初始化
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

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

// 主函數
async function main() {
  // 載入環境變數
  loadEnv();
  
  // 初始化 Prisma 客戶端
  const prisma = new PrismaClient();
  
  try {
    // 檢查權限表
    const permissions = await prisma.permission.findMany();
    console.log(`權限表中有 ${permissions.length} 個記錄`);
    if (permissions.length > 0) {
      console.log('權限範例:');
      console.log(permissions.slice(0, 3));
    }
    
    // 檢查角色表
    const roles = await prisma.role.findMany();
    console.log(`\n角色表中有 ${roles.length} 個記錄`);
    if (roles.length > 0) {
      console.log('角色範例:');
      console.log(roles.slice(0, 3));
    }
    
    // 檢查角色權限表
    const rolePermissions = await prisma.rolePermission.findMany();
    console.log(`\n角色權限表中有 ${rolePermissions.length} 個記錄`);
    if (rolePermissions.length > 0) {
      console.log('角色權限範例:');
      console.log(rolePermissions.slice(0, 3));
    }
    
    // 檢查用戶角色表
    const userRoles = await prisma.userRole.findMany();
    console.log(`\n用戶角色表中有 ${userRoles.length} 個記錄`);
    if (userRoles.length > 0) {
      console.log('用戶角色範例:');
      console.log(userRoles.slice(0, 3));
    }
    
    // 檢查用戶表
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    console.log(`\n用戶表中有 ${users.length} 個記錄`);
    if (users.length > 0) {
      console.log('用戶範例:');
      console.log(users.slice(0, 3));
    }
    
    // 檢查用戶與角色的關聯
    if (users.length > 0 && roles.length > 0) {
      const firstUser = users[0];
      console.log(`\n檢查用戶 ${firstUser.email} 的角色關聯:`);
      
      const userRoleAssociations = await prisma.userRole.findMany({
        where: { userId: firstUser.id },
        include: { role: true }
      });
      
      if (userRoleAssociations.length > 0) {
        console.log(`用戶 ${firstUser.email} 有 ${userRoleAssociations.length} 個角色關聯`);
        console.log('角色關聯:');
        console.log(userRoleAssociations.map(ur => ({
          roleId: ur.roleId,
          roleName: ur.role.name
        })));
      } else {
        console.log(`用戶 ${firstUser.email} 沒有角色關聯`);
      }
    }
  } catch (error) {
    console.error('檢查權限系統時發生錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 執行主函數
main();
