// 初始化角色和權限的簡化腳本
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
async function createPermissions() {
  console.log('創建權限...');
  
  for (const permission of permissions) {
    try {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {},
        create: permission
      });
      console.log(`創建權限: ${permission.name}`);
    } catch (error) {
      console.error(`創建權限 ${permission.name} 失敗:`, error);
    }
  }
}

// 初始化角色
async function createRoles() {
  console.log('創建角色...');
  
  for (const role of roles) {
    try {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role
      });
      console.log(`創建角色: ${role.name}`);
    } catch (error) {
      console.error(`創建角色 ${role.name} 失敗:`, error);
    }
  }
}

// 初始化角色權限
async function createRolePermissions() {
  console.log('設置角色權限...');
  
  // 獲取所有權限和角色
  const dbPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(dbPermissions.map(p => [p.name, p.id]));
  
  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    try {
      // 獲取角色
      const role = await prisma.role.findUnique({
        where: { name: roleName }
      });
      
      if (!role) {
        console.log(`找不到角色: ${roleName}`);
        continue;
      }
      
      // 為角色設置權限
      for (const permName of permissionNames) {
        const permId = permissionMap.get(permName);
        
        if (!permId) {
          console.log(`找不到權限: ${permName}`);
          continue;
        }
        
        // 檢查是否已存在
        const existing = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId
            }
          }
        });
        
        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permId
            }
          });
          console.log(`為角色 ${roleName} 添加權限: ${permName}`);
        }
      }
    } catch (error) {
      console.error(`為角色 ${roleName} 設置權限失敗:`, error);
    }
  }
}

// 為用戶分配角色
async function assignRolesToUsers() {
  console.log('為用戶分配角色...');
  
  // 獲取所有用戶
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    try {
      // 獲取對應的角色
      const role = await prisma.role.findUnique({
        where: { name: user.role }
      });
      
      if (!role) {
        console.log(`找不到用戶 ${user.email} 的角色: ${user.role}`);
        continue;
      }
      
      // 檢查是否已存在
      const existing = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id
          }
        }
      });
      
      if (!existing) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id
          }
        });
        console.log(`為用戶 ${user.email} 分配角色: ${user.role}`);
      }
    } catch (error) {
      console.error(`為用戶 ${user.email} 分配角色失敗:`, error);
    }
  }
}

// 主函數
async function main() {
  console.log('開始初始化權限系統...');
  
  try {
    // 創建權限
    await createPermissions();
    
    // 創建角色
    await createRoles();
    
    // 設置角色權限
    await createRolePermissions();
    
    // 為用戶分配角色
    await assignRolesToUsers();
    
    // 檢查結果
    const permCount = await prisma.permission.count();
    const roleCount = await prisma.role.count();
    const rolePerm = await prisma.rolePermission.count();
    const userRole = await prisma.userRole.count();
    
    console.log('\n初始化結果:');
    console.log(`- 權限: ${permCount}`);
    console.log(`- 角色: ${roleCount}`);
    console.log(`- 角色權限: ${rolePerm}`);
    console.log(`- 用戶角色: ${userRole}`);
    
    console.log('\n權限系統初始化完成!');
  } catch (error) {
    console.error('初始化過程中發生錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 執行主函數
main();
