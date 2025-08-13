import { prisma } from '@/lib/prisma';
import { ROLE_PERMISSIONS } from 'shared-types';

// 定義權限列表資料
const permissions = [
  { name: 'view_all_tickets', description: '查看所有工單' },
  { name: 'view_tickets', description: '查看工單' },
  { name: 'create_tickets', description: '建立工單' },
  { name: 'edit_tickets', description: '編輯工單' },
  { name: 'delete_tickets', description: '刪除工單' },
  { name: 'assign_tickets', description: '分配工單' },
  { name: 'claim_tickets', description: '認領工單' },
  { name: 'complete_tickets', description: '完成工單' },
  { name: 'verify_tickets', description: '驗收工單' },
  { name: 'view_all_reports', description: '查看所有通報' },
  { name: 'view_reports', description: '查看通報' },
  { name: 'create_reports', description: '建立通報' },
  { name: 'edit_reports', description: '編輯通報' },
  { name: 'delete_reports', description: '刪除通報' },
  { name: 'process_reports', description: '處理通報' },
  { name: 'review_reports', description: '審核通報' },
  { name: 'view_users', description: '查看用戶' },
  { name: 'create_users', description: '建立用戶' },
  { name: 'edit_users', description: '編輯用戶' },
  { name: 'delete_users', description: '刪除用戶' },
  { name: 'manage_roles', description: '管理角色' },
  { name: 'assign_permissions', description: '分配權限' },
  { name: 'manage_settings', description: '管理設定' },
  { name: 'manage_categories', description: '管理分類' },
  { name: 'manage_locations', description: '管理空間' },
];

const roles = [
  { name: 'ADMIN', description: '系統管理員' },
  { name: 'MANAGER', description: '區域總監' },
  { name: 'STAFF', description: '管家' },
  { name: 'USER', description: '一般用戶' },
  { name: 'REPORT_PROCESSOR', description: '營業專員' },
  { name: 'REPORT_REVIEWER', description: '通報審核員' },
  { name: 'CUSTOMER_SERVICE', description: '客服人員' },
  { name: 'MAINTENANCE_WORKER', description: '維修工務' },
];

/**
 * 初始化系統權限
 * 將所有權限添加到數據庫中
 */
async function initializePermissions(): Promise<void> {
  console.log('初始化權限...');

  for (const permission of permissions) {
    try {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {},
        create: permission,
      });
      console.log(`建立權限: ${permission.name}`);
    } catch (error) {
      console.error(`建立權限 ${permission.name} 失敗:`, error.message);
    }
  }
}

/**
 * 初始化角色
 * 將所有角色添加到數據庫中
 */
async function initializeRoles() {
  console.log('初始化角色...');

  for (const role of roles) {
    try {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      });
      console.log(`建立角色: ${role.name}`);
    } catch (error) {
      console.error(`建立角色 ${role.name} 失敗:`, error.message);
    }
  }
}

/**
 * 初始化角色默認權限
 * 為每個角色設置默認權限
 */
async function initializeRolePermissions(): Promise<void> {
  // 獲取所有權限
  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(permissions.map((p) => [p.name, p.id]));

  // 獲取所有角色
  const roles = await prisma.role.findMany();
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  // 為每個角色設置默認權限
  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
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
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: roleId,
            permissionId: permId,
          },
        });
        console.log(`為角色 ${roleName} 設置權限: ${permName}`);
      } catch (error) {
        console.error(
          `為角色 ${roleName} 設置權限 ${permName} 失敗:`,
          error.message
        );
      }
    }
  }
}

/**
 * 為現有用戶分配角色
 */
async function assignRolesToExistingUsers(): Promise<void> {
  try {
    // 獲取所有用戶
    const users = await prisma.user.findMany();

    // 獲取所有角色
    const roles = await prisma.role.findMany();
    const roleMap = new Map(roles.map((r) => [r.name, r.id]));

    // 為每個用戶分配角色
    for (const user of users) {
      // 檢查用戶是否已有角色
      const existingUserRoles = await prisma.userRole.count({
        where: { userId: user.id },
      });

      if (existingUserRoles > 0) {
        console.log(`用戶 ${user.email} 已有角色分配，跳過`);
        continue;
      }

      // 根據用戶的 role 字段分配對應的角色
      const roleName = user.role;
      const roleId = roleMap.get(roleName);

      if (!roleId) {
        console.log(
          `找不到角色 ${roleName}，跳過為用戶 ${user.email} 分配角色`
        );
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

export async function seedPermissions() {
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
    await assignRolesToExistingUsers();

    // 檢查結果
    console.log('步驟 5: 檢查結果...');
    await checkResults();

    console.log('權限系統初始化完成!');
  } catch (error) {
    console.error('初始化過程中發生錯誤:', error);
  }
}
