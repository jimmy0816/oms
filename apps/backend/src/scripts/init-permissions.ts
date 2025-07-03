const { prisma } = require('prisma-client');
const { Permission, UserRole, ROLE_PERMISSIONS } = require('shared-types');

/**
 * 初始化系統權限
 * 將所有權限添加到數據庫中
 */
async function initializePermissions(): Promise<void> {
  try {
    // 檢查權限表是否已初始化
    const permissionCount = await prisma.permission.count();
    
    if (permissionCount > 0) {
      console.log('權限已初始化，跳過初始化過程');
      return;
    }
    
    // 將所有權限添加到數據庫
    const permissions = Object.values(Permission).map(name => ({
      name,
      description: name.replace(/_/g, ' ').toLowerCase(),
    }));
    
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

/**
 * 初始化角色默認權限
 * 為每個角色設置默認權限
 */
async function initializeRolePermissions(): Promise<void> {
  try {
    // 獲取所有權限
    const permissions = await prisma.permission.findMany();
    const permissionMap = new Map(permissions.map(p => [p.name, p.id]));
    
    // 為每個角色設置默認權限
    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      // 檢查角色是否存在
      let role = await prisma.role.findUnique({
        where: { name: roleName },
      });
      
      // 如果角色不存在，創建它
      if (!role) {
        role = await prisma.role.create({
          data: {
            name: roleName,
            description: `${roleName} 角色`,
          },
        });
        console.log(`創建角色: ${roleName}`);
      }
      
      // 檢查該角色是否已有權限設置
      const existingPermissions = await prisma.rolePermission.count({
        where: { roleId: role.id },
      });
      
      // 如果已有權限設置，則跳過
      if (existingPermissions > 0) {
        console.log(`角色 ${roleName} 已有權限設置，跳過初始化`);
        continue;
      }
      
      // 為角色添加默認權限
      const rolePermissions = permissionNames
        .filter(name => permissionMap.has(name))
        .map(name => ({
          roleId: role!.id,
          permissionId: permissionMap.get(name)!,
        }));
      
      if (rolePermissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: rolePermissions,
          skipDuplicates: true,
        });
        
        console.log(`成功為角色 ${roleName} 設置了 ${rolePermissions.length} 個默認權限`);
      }
    }
  } catch (error) {
    console.error('初始化角色權限失敗:', error);
    throw error;
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
    const roleMap = new Map(roles.map(r => [r.name, r.id]));
    
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

async function main() {
  console.log('開始初始化權限系統...');
  
  try {
    // 初始化權限
    console.log('步驟 1: 初始化權限...');
    await initializePermissions();
    
    // 檢查權限是否已創建
    const permissionsCount = await prisma.permission.count();
    console.log(`權限表中有 ${permissionsCount} 個權限記錄`);
    
    // 初始化角色權限
    console.log('步驟 2: 初始化角色權限...');
    await initializeRolePermissions();
    
    // 檢查角色權限是否已創建
    const rolePermissionsCount = await prisma.rolePermission.count();
    console.log(`角色權限表中有 ${rolePermissionsCount} 個記錄`);
    
    // 為現有用戶分配角色
    console.log('步驟 3: 為現有用戶分配角色...');
    await assignRolesToExistingUsers();
    
    // 檢查用戶角色是否已分配
    const userRolesCount = await prisma.userRole.count();
    console.log(`用戶角色表中有 ${userRolesCount} 個記錄`);
    
    console.log('權限系統初始化完成');
  } catch (error) {
    console.error('初始化過程中發生錯誤:', error);
  }
}

main()
  .catch((e) => {
    console.error('初始化失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
