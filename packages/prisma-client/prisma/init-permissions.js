// 初始化權限和角色權限的腳本
const fs = require('fs');
const path = require('path');

// 讀取環境變數
function loadEnv() {
  try {
    // 嘗試讀取 .env.development 檔案
    const envPath = path.resolve(__dirname, '../../../apps/backend/.env.development');
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

// 載入環境變數
loadEnv();

// 檢查資料庫連線字串
if (!process.env.DATABASE_URL) {
  console.error('錯誤: 找不到 DATABASE_URL 環境變數');
  process.exit(1);
}

console.log('資料庫連線字串:', process.env.DATABASE_URL.substring(0, 20) + '...');

// 初始化 Prisma 客戶端
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 定義權限列表
const permissions = [
  { name: 'view_tickets', description: 'view tickets' },
  { name: 'create_tickets', description: 'create tickets' },
  { name: 'edit_tickets', description: 'edit tickets' },
  { name: 'delete_tickets', description: 'delete tickets' },
  { name: 'assign_tickets', description: 'assign tickets' },
  { name: 'claim_tickets', description: 'claim tickets' },
  { name: 'complete_tickets', description: 'complete tickets' },
  { name: 'verify_tickets', description: 'verify tickets' },
  { name: 'view_reports', description: 'view reports' },
  { name: 'create_reports', description: 'create reports' },
  { name: 'process_reports', description: 'process reports' },
  { name: 'review_reports', description: 'review reports' },
  { name: 'view_users', description: 'view users' },
  { name: 'create_users', description: 'create users' },
  { name: 'edit_users', description: 'edit users' },
  { name: 'delete_users', description: 'delete users' },
  { name: 'manage_roles', description: 'manage roles' },
  { name: 'assign_permissions', description: 'assign permissions' }
];

// 定義角色列表
const roles = [
  { name: 'ADMIN', description: 'Administrator role' },
  { name: 'MANAGER', description: 'Manager role' },
  { name: 'STAFF', description: 'Staff role' },
  { name: 'USER', description: 'Regular user role' },
  { name: 'REPORT_PROCESSOR', description: 'Report processor role' },
  { name: 'REPORT_REVIEWER', description: 'Report reviewer role' },
  { name: 'CUSTOMER_SERVICE', description: 'Customer service role' },
  { name: 'MAINTENANCE_WORKER', description: 'Maintenance worker role' }
];

// 定義角色權限映射
const rolePermissions = {
  'ADMIN': [
    'view_tickets', 'create_tickets', 'edit_tickets', 'delete_tickets', 
    'assign_tickets', 'claim_tickets', 'complete_tickets', 'verify_tickets',
    'view_reports', 'create_reports', 'process_reports', 'review_reports',
    'view_users', 'create_users', 'edit_users', 'delete_users',
    'manage_roles', 'assign_permissions'
  ],
  'MANAGER': [
    'view_tickets', 'create_tickets', 'edit_tickets', 'assign_tickets', 
    'verify_tickets', 'view_reports', 'process_reports', 'review_reports', 
    'view_users'
  ],
  'STAFF': [
    'view_tickets', 'claim_tickets', 'complete_tickets'
  ],
  'USER': [
    'view_tickets', 'create_reports'
  ],
  'REPORT_PROCESSOR': [
    'view_tickets', 'create_tickets', 'edit_tickets', 'assign_tickets',
    'view_reports', 'create_reports', 'process_reports'
  ],
  'REPORT_REVIEWER': [
    'view_tickets', 'view_reports', 'review_reports', 'verify_tickets'
  ],
  'CUSTOMER_SERVICE': [
    'view_tickets', 'create_tickets', 'view_reports', 'create_reports'
  ],
  'MAINTENANCE_WORKER': [
    'view_tickets', 'claim_tickets', 'complete_tickets'
  ]
};

// 初始化權限
async function initializePermissions() {
  try {
    // 檢查權限表是否已初始化
    const existingPermissions = await prisma.permission.findMany();
    const permissionCount = existingPermissions.length;
    
    if (permissionCount > 0) {
      console.log('權限已初始化，跳過初始化過程');
      return;
    }
    
    // 將所有權限添加到數據庫
    await prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });
    
    console.log(`成功初始化 ${permissions.length} 個權限`);
  } catch (error) {
    console.error('初始化權限失敗:', error);
    throw error;
  }
}

// 初始化角色
async function initializeRoles() {
  try {
    // 檢查角色表是否已初始化
    const existingRoles = await prisma.role.findMany();
    const roleCount = existingRoles.length;
    
    if (roleCount > 0) {
      console.log('角色已初始化，跳過初始化過程');
      return;
    }
    
    // 將所有角色添加到數據庫
    await prisma.role.createMany({
      data: roles,
      skipDuplicates: true,
    });
    
    console.log(`成功初始化 ${roles.length} 個角色`);
  } catch (error) {
    console.error('初始化角色失敗:', error);
    throw error;
  }
}

// 初始化角色權限
async function initializeRolePermissions() {
  try {
    // 獲取所有權限
    const permissionsFromDb = await prisma.permission.findMany();
    const permissionMap = new Map(permissionsFromDb.map(p => [p.name, p.id]));
    
    // 獲取所有角色
    const rolesFromDb = await prisma.role.findMany();
    
    // 為每個角色設置權限
    for (const role of rolesFromDb) {
      // 檢查該角色是否已有權限設置
      const existingRolePermissions = await prisma.rolePermission.findMany({
        where: { roleId: role.id },
      });
      const existingPermissions = existingRolePermissions.length;
      
      // 如果已有權限設置，則跳過
      if (existingPermissions > 0) {
        console.log(`角色 ${role.name} 已有權限設置，跳過初始化`);
        continue;
      }
      
      // 獲取該角色的權限列表
      const permissionNames = rolePermissions[role.name] || [];
      
      // 為角色添加權限
      const rolePermissionsData = [];
      
      for (const permName of permissionNames) {
        const permId = permissionMap.get(permName);
        if (permId) {
          rolePermissionsData.push({
            roleId: role.id,
            permissionId: permId,
          });
        }
      }
      
      if (rolePermissionsData.length > 0) {
        await prisma.rolePermission.createMany({
          data: rolePermissionsData,
          skipDuplicates: true,
        });
        
        console.log(`成功為角色 ${role.name} 設置了 ${rolePermissionsData.length} 個權限`);
      }
    }
  } catch (error) {
    console.error('初始化角色權限失敗:', error);
    throw error;
  }
}

// 為現有用戶分配角色
async function assignRolesToUsers() {
  try {
    // 獲取所有用戶
    const users = await prisma.user.findMany();
    
    // 獲取所有角色
    const roles = await prisma.role.findMany();
    const roleMap = new Map(roles.map(r => [r.name, r.id]));
    
    // 為每個用戶分配角色
    for (const user of users) {
      // 檢查用戶是否已有角色
      const userRolesFound = await prisma.userRole.findMany({
        where: { userId: user.id },
      });
      const existingUserRoles = userRolesFound.length;
      
      if (existingUserRoles > 0) {
        console.log(`用戶 ${user.email} 已有角色分配，跳過`);
        continue;
      }
      
      // 根據用戶的 role 字段分配對應的角色
      const roleName = user.role;
      const roleId = roleMap.get(roleName);
      
      if (!roleId) {
        console.log(`找不到角色 ${roleName}，跳過為用戶 ${user.email} 分配角色`);
        continue;
      }
      
      // 為用戶分配角色
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: roleId,
        },
      });
      
      console.log(`成功為用戶 ${user.email} 分配角色 ${roleName}`);
    }
  } catch (error) {
    console.error('為現有用戶分配角色失敗:', error);
    throw error;
  }
}

// 主函數
async function main() {
  console.log('開始初始化權限系統...');
  
  try {
    // 初始化權限
    console.log('步驟 1: 初始化權限...');
    await initializePermissions();
    
    // 初始化角色
    console.log('步驟 2: 初始化角色...');
    await initializeRoles();
    
    // 初始化角色權限
    console.log('步驟 3: 初始化角色權限...');
    await initializeRolePermissions();
    
    // 為現有用戶分配角色
    console.log('步驟 4: 為現有用戶分配角色...');
    await assignRolesToUsers();
    
    // 檢查結果
    const permissionsResult = await prisma.permission.findMany();
    const rolesResult = await prisma.role.findMany();
    const rolePermissionsResult = await prisma.rolePermission.findMany();
    const userRolesResult = await prisma.userRole.findMany();
    
    const permissionsCount = permissionsResult.length;
    const rolesCount = rolesResult.length;
    const rolePermissionsCount = rolePermissionsResult.length;
    const userRolesCount = userRolesResult.length;
    
    console.log('初始化結果:');
    console.log(`- 權限表中有 ${permissionsCount} 個記錄`);
    console.log(`- 角色表中有 ${rolesCount} 個記錄`);
    console.log(`- 角色權限表中有 ${rolePermissionsCount} 個記錄`);
    console.log(`- 用戶角色表中有 ${userRolesCount} 個記錄`);
    
    console.log('權限系統初始化完成');
  } catch (error) {
    console.error('初始化過程中發生錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 執行主函數
main();
