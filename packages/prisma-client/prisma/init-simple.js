// 簡化版 Prisma 初始化腳本
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 定義權限列表
const permissions = [
  { name: 'view_tickets', description: '查看票務' },
  { name: 'create_tickets', description: '建立票務' },
  { name: 'edit_tickets', description: '編輯票務' },
  { name: 'delete_tickets', description: '刪除票務' },
  { name: 'assign_tickets', description: '分配票務' },
  { name: 'claim_tickets', description: '認領票務' },
  { name: 'complete_tickets', description: '完成票務' },
  { name: 'verify_tickets', description: '驗證票務' },
  { name: 'view_reports', description: '查看報告' },
  { name: 'create_reports', description: '建立報告' },
  { name: 'process_reports', description: '處理報告' },
  { name: 'review_reports', description: '審核報告' },
  { name: 'view_users', description: '查看用戶' },
  { name: 'create_users', description: '建立用戶' },
  { name: 'edit_users', description: '編輯用戶' },
  { name: 'delete_users', description: '刪除用戶' },
  { name: 'manage_roles', description: '管理角色' },
  { name: 'assign_permissions', description: '分配權限' }
];

// 定義角色列表
const roles = [
  { name: 'ADMIN', description: '管理員' },
  { name: 'MANAGER', description: '經理' },
  { name: 'STAFF', description: '員工' },
  { name: 'USER', description: '一般用戶' },
  { name: 'REPORT_PROCESSOR', description: '報告處理員' },
  { name: 'REPORT_REVIEWER', description: '報告審核員' },
  { name: 'CUSTOMER_SERVICE', description: '客服人員' },
  { name: 'MAINTENANCE_WORKER', description: '維修人員' }
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
  console.log('初始化權限...');
  
  for (const permission of permissions) {
    try {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {},
        create: permission
      });
      console.log(`建立權限: ${permission.name}`);
    } catch (error) {
      console.error(`建立權限 ${permission.name} 失敗:`, error.message);
    }
  }
}

// 初始化角色
async function initializeRoles() {
  console.log('初始化角色...');
  
  for (const role of roles) {
    try {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role
      });
      console.log(`建立角色: ${role.name}`);
    } catch (error) {
      console.error(`建立角色 ${role.name} 失敗:`, error.message);
    }
  }
}

// 初始化角色權限
async function initializeRolePermissions() {
  console.log('初始化角色權限...');
  
  // 獲取所有權限
  const dbPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(dbPermissions.map(p => [p.name, p.id]));
  
  // 獲取所有角色
  const dbRoles = await prisma.role.findMany();
  const roleMap = new Map(dbRoles.map(r => [r.name, r.id]));
  
  // 為每個角色設置權限
  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    try {
      const roleId = roleMap.get(roleName);
      if (!roleId) {
        console.log(`找不到角色: ${roleName}`);
        continue;
      }
      
      for (const permName of permissionNames) {
        const permId = permissionMap.get(permName);
        if (!permId) {
          console.log(`找不到權限: ${permName}`);
          continue;
        }
        
        try {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: roleId,
                permissionId: permId
              }
            },
            update: {},
            create: {
              roleId: roleId,
              permissionId: permId
            }
          });
          console.log(`為角色 ${roleName} 設置權限: ${permName}`);
        } catch (error) {
          console.error(`為角色 ${roleName} 設置權限 ${permName} 失敗:`, error.message);
        }
      }
    } catch (error) {
      console.error(`處理角色 ${roleName} 的權限時發生錯誤:`, error.message);
    }
  }
}

// 為用戶分配角色
async function assignRolesToUsers() {
  console.log('為用戶分配角色...');
  
  // 獲取所有用戶
  const users = await prisma.user.findMany();
  
  // 獲取所有角色
  const dbRoles = await prisma.role.findMany();
  const roleMap = new Map(dbRoles.map(r => [r.name, r.id]));
  
  // 為每個用戶分配角色
  for (const user of users) {
    try {
      const roleId = roleMap.get(user.role);
      if (!roleId) {
        console.log(`找不到用戶 ${user.email} 的角色: ${user.role}`);
        continue;
      }
      
      try {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId: roleId
            }
          },
          update: {},
          create: {
            userId: user.id,
            roleId: roleId
          }
        });
        console.log(`為用戶 ${user.email} 分配角色: ${user.role}`);
      } catch (error) {
        console.error(`為用戶 ${user.email} 分配角色 ${user.role} 失敗:`, error.message);
      }
    } catch (error) {
      console.error(`處理用戶 ${user.email} 的角色分配時發生錯誤:`, error.message);
    }
  }
}

// 檢查結果
async function checkResults() {
  try {
    const permCount = await prisma.permission.count();
    const roleCount = await prisma.role.count();
    const rolePerm = await prisma.rolePermission.count();
    const userRole = await prisma.userRole.count();
    
    console.log('\n初始化結果:');
    console.log(`- 權限: ${permCount}`);
    console.log(`- 角色: ${roleCount}`);
    console.log(`- 角色權限: ${rolePerm}`);
    console.log(`- 用戶角色: ${userRole}`);
  } catch (error) {
    console.error('檢查結果時發生錯誤:', error.message);
  }
}

// 主函數
async function main() {
  console.log('開始初始化權限系統...');
  
  try {
    // 初始化權限
    await initializePermissions();
    
    // 初始化角色
    await initializeRoles();
    
    // 初始化角色權限
    await initializeRolePermissions();
    
    // 為用戶分配角色
    await assignRolesToUsers();
    
    // 檢查結果
    await checkResults();
    
    console.log('\n權限系統初始化完成!');
  } catch (error) {
    console.error('初始化過程中發生錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 執行主函數
main();
