-- 檢查是否有權限記錄，如果沒有則創建
DO $$
DECLARE
  permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permission_count FROM "Permission";
  
  IF permission_count = 0 THEN
    -- 插入權限記錄
    INSERT INTO "Permission" (id, name, description, "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'view_tickets', 'view tickets', NOW(), NOW()),
      (gen_random_uuid(), 'create_tickets', 'create tickets', NOW(), NOW()),
      (gen_random_uuid(), 'edit_tickets', 'edit tickets', NOW(), NOW()),
      (gen_random_uuid(), 'delete_tickets', 'delete tickets', NOW(), NOW()),
      (gen_random_uuid(), 'assign_tickets', 'assign tickets', NOW(), NOW()),
      (gen_random_uuid(), 'claim_tickets', 'claim tickets', NOW(), NOW()),
      (gen_random_uuid(), 'complete_tickets', 'complete tickets', NOW(), NOW()),
      (gen_random_uuid(), 'verify_tickets', 'verify tickets', NOW(), NOW()),
      (gen_random_uuid(), 'view_reports', 'view reports', NOW(), NOW()),
      (gen_random_uuid(), 'create_reports', 'create reports', NOW(), NOW()),
      (gen_random_uuid(), 'process_reports', 'process reports', NOW(), NOW()),
      (gen_random_uuid(), 'review_reports', 'review reports', NOW(), NOW()),
      (gen_random_uuid(), 'view_users', 'view users', NOW(), NOW()),
      (gen_random_uuid(), 'create_users', 'create users', NOW(), NOW()),
      (gen_random_uuid(), 'edit_users', 'edit users', NOW(), NOW()),
      (gen_random_uuid(), 'delete_users', 'delete users', NOW(), NOW()),
      (gen_random_uuid(), 'manage_roles', 'manage roles', NOW(), NOW()),
      (gen_random_uuid(), 'assign_permissions', 'assign permissions', NOW(), NOW());
      
    RAISE NOTICE '已創建權限記錄';
  ELSE
    RAISE NOTICE '權限記錄已存在，跳過創建';
  END IF;
END $$;

-- 檢查是否有角色記錄，如果沒有則創建
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM "Role";
  
  IF role_count = 0 THEN
    -- 插入角色記錄
    INSERT INTO "Role" (id, name, description, "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'ADMIN', 'Administrator role', NOW(), NOW()),
      (gen_random_uuid(), 'MANAGER', 'Manager role', NOW(), NOW()),
      (gen_random_uuid(), 'STAFF', 'Staff role', NOW(), NOW()),
      (gen_random_uuid(), 'USER', 'Regular user role', NOW(), NOW()),
      (gen_random_uuid(), 'REPORT_PROCESSOR', 'Report processor role', NOW(), NOW()),
      (gen_random_uuid(), 'REPORT_REVIEWER', 'Report reviewer role', NOW(), NOW()),
      (gen_random_uuid(), 'CUSTOMER_SERVICE', 'Customer service role', NOW(), NOW()),
      (gen_random_uuid(), 'MAINTENANCE_WORKER', 'Maintenance worker role', NOW(), NOW());
      
    RAISE NOTICE '已創建角色記錄';
  ELSE
    RAISE NOTICE '角色記錄已存在，跳過創建';
  END IF;
END $$;

-- 為ADMIN角色分配所有權限
DO $$
DECLARE
  admin_role_id UUID;
  perm_id UUID;
  perm_count INTEGER;
BEGIN
  -- 獲取ADMIN角色ID
  SELECT id INTO admin_role_id FROM "Role" WHERE name = 'ADMIN' LIMIT 1;
  
  IF admin_role_id IS NOT NULL THEN
    -- 檢查該角色是否已有權限
    EXECUTE 'SELECT COUNT(*) FROM "RolePermission" WHERE "roleId" = $1' INTO perm_count USING admin_role_id;
    
    IF perm_count = 0 THEN
      -- 為ADMIN角色分配所有權限
      FOR perm_id IN SELECT id FROM "Permission" LOOP
        INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
        VALUES (admin_role_id, perm_id, NOW());
      END LOOP;
      
      RAISE NOTICE 'ADMIN角色已分配所有權限';
    ELSE
      RAISE NOTICE 'ADMIN角色已有權限分配，跳過';
    END IF;
  ELSE
    RAISE NOTICE '找不到ADMIN角色';
  END IF;
END $$;

-- 為MANAGER角色分配權限
DO $$
DECLARE
  manager_role_id UUID;
  perm_id UUID;
  perm_count INTEGER;
  perm_name TEXT;
  perm_names TEXT[] := ARRAY['view_tickets', 'create_tickets', 'edit_tickets', 
                           'assign_tickets', 'verify_tickets', 'view_reports', 
                           'process_reports', 'review_reports', 'view_users'];
BEGIN
  -- 獲取MANAGER角色ID
  SELECT id INTO manager_role_id FROM "Role" WHERE name = 'MANAGER' LIMIT 1;
  
  IF manager_role_id IS NOT NULL THEN
    -- 檢查該角色是否已有權限
    EXECUTE 'SELECT COUNT(*) FROM "RolePermission" WHERE "roleId" = $1' INTO perm_count USING manager_role_id;
    
    IF perm_count = 0 THEN
      -- 為MANAGER角色分配權限
      FOREACH perm_name IN ARRAY perm_names LOOP
        SELECT id INTO perm_id FROM "Permission" WHERE name = perm_name LIMIT 1;
        
        IF perm_id IS NOT NULL THEN
          INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
          VALUES (manager_role_id, perm_id, NOW());
        END IF;
      END LOOP;
      
      RAISE NOTICE 'MANAGER角色已分配權限';
    ELSE
      RAISE NOTICE 'MANAGER角色已有權限分配，跳過';
    END IF;
  ELSE
    RAISE NOTICE '找不到MANAGER角色';
  END IF;
END $$;

-- 為USER角色分配權限
DO $$
DECLARE
  user_role_id UUID;
  perm_id UUID;
  perm_count INTEGER;
  perm_name TEXT;
  perm_names TEXT[] := ARRAY['view_tickets', 'create_reports'];
BEGIN
  -- 獲取USER角色ID
  SELECT id INTO user_role_id FROM "Role" WHERE name = 'USER' LIMIT 1;
  
  IF user_role_id IS NOT NULL THEN
    -- 檢查該角色是否已有權限
    EXECUTE 'SELECT COUNT(*) FROM "RolePermission" WHERE "roleId" = $1' INTO perm_count USING user_role_id;
    
    IF perm_count = 0 THEN
      -- 為USER角色分配權限
      FOREACH perm_name IN ARRAY perm_names LOOP
        SELECT id INTO perm_id FROM "Permission" WHERE name = perm_name LIMIT 1;
        
        IF perm_id IS NOT NULL THEN
          INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
          VALUES (user_role_id, perm_id, NOW());
        END IF;
      END LOOP;
      
      RAISE NOTICE 'USER角色已分配權限';
    ELSE
      RAISE NOTICE 'USER角色已有權限分配，跳過';
    END IF;
  ELSE
    RAISE NOTICE '找不到USER角色';
  END IF;
END $$;

-- 為現有用戶分配角色
DO $$
DECLARE
  user_record RECORD;
  role_id UUID;
  user_role_count INTEGER;
BEGIN
  FOR user_record IN SELECT id, role FROM "User" LOOP
    -- 檢查用戶是否已有角色分配
    EXECUTE 'SELECT COUNT(*) FROM "UserRole" WHERE "userId" = $1' INTO user_role_count USING user_record.id;
    
    IF user_role_count = 0 THEN
      -- 獲取對應角色ID
      SELECT id INTO role_id FROM "Role" WHERE name = user_record.role LIMIT 1;
      
      IF role_id IS NOT NULL THEN
        -- 為用戶分配角色
        INSERT INTO "UserRole" ("userId", "roleId", "assignedAt")
        VALUES (user_record.id, role_id, NOW());
        
        RAISE NOTICE '用戶 % 已分配角色 %', user_record.id, user_record.role;
      ELSE
        RAISE NOTICE '找不到角色 %', user_record.role;
      END IF;
    ELSE
      RAISE NOTICE '用戶 % 已有角色分配，跳過', user_record.id;
    END IF;
  END LOOP;
END $$;

-- 為STAFF角色分配權限
DO $$
DECLARE
  staff_role_id UUID;
  perm_id UUID;
  perm_count INTEGER;
  perm_name TEXT;
  perm_names TEXT[] := ARRAY['view_tickets', 'claim_tickets', 'complete_tickets'];
BEGIN
  -- 獲取STAFF角色ID
  SELECT id INTO staff_role_id FROM "Role" WHERE name = 'STAFF' LIMIT 1;
  
  IF staff_role_id IS NOT NULL THEN
    -- 檢查該角色是否已有權限
    EXECUTE 'SELECT COUNT(*) FROM "RolePermission" WHERE "roleId" = $1' INTO perm_count USING staff_role_id;
    
    IF perm_count = 0 THEN
      -- 為STAFF角色分配權限
      FOREACH perm_name IN ARRAY perm_names LOOP
        SELECT id INTO perm_id FROM "Permission" WHERE name = perm_name LIMIT 1;
        
        IF perm_id IS NOT NULL THEN
          INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
          VALUES (staff_role_id, perm_id, NOW());
        END IF;
      END LOOP;
      
      RAISE NOTICE 'STAFF角色已分配權限';
    ELSE
      RAISE NOTICE 'STAFF角色已有權限分配，跳過';
    END IF;
  ELSE
    RAISE NOTICE '找不到STAFF角色';
  END IF;
END $$;

-- 為REPORT_PROCESSOR角色分配權限
DO $$
DECLARE
  role_id UUID;
  perm_id UUID;
  perm_count INTEGER;
  perm_name TEXT;
  perm_names TEXT[] := ARRAY['view_tickets', 'create_tickets', 'edit_tickets', 'assign_tickets',
                           'view_reports', 'create_reports', 'process_reports'];
BEGIN
  -- 獲取角色ID
  SELECT id INTO role_id FROM "Role" WHERE name = 'REPORT_PROCESSOR' LIMIT 1;
  
  IF role_id IS NOT NULL THEN
    -- 檢查該角色是否已有權限
    EXECUTE 'SELECT COUNT(*) FROM "RolePermission" WHERE "roleId" = $1' INTO perm_count USING role_id;
    
    IF perm_count = 0 THEN
      -- 為角色分配權限
      FOREACH perm_name IN ARRAY perm_names LOOP
        SELECT id INTO perm_id FROM "Permission" WHERE name = perm_name LIMIT 1;
        
        IF perm_id IS NOT NULL THEN
          INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
          VALUES (role_id, perm_id, NOW());
        END IF;
      END LOOP;
      
      RAISE NOTICE 'REPORT_PROCESSOR角色已分配權限';
    ELSE
      RAISE NOTICE 'REPORT_PROCESSOR角色已有權限分配，跳過';
    END IF;
  ELSE
    RAISE NOTICE '找不到REPORT_PROCESSOR角色';
  END IF;
END $$;

-- 為REPORT_REVIEWER角色分配權限
DO $$
DECLARE
  role_id UUID;
  perm_id UUID;
  perm_count INTEGER;
  perm_name TEXT;
  perm_names TEXT[] := ARRAY['view_tickets', 'view_reports', 'review_reports', 'verify_tickets'];
BEGIN
  -- 獲取角色ID
  SELECT id INTO role_id FROM "Role" WHERE name = 'REPORT_REVIEWER' LIMIT 1;
  
  IF role_id IS NOT NULL THEN
    -- 檢查該角色是否已有權限
    EXECUTE 'SELECT COUNT(*) FROM "RolePermission" WHERE "roleId" = $1' INTO perm_count USING role_id;
    
    IF perm_count = 0 THEN
      -- 為角色分配權限
      FOREACH perm_name IN ARRAY perm_names LOOP
        SELECT id INTO perm_id FROM "Permission" WHERE name = perm_name LIMIT 1;
        
        IF perm_id IS NOT NULL THEN
          INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
          VALUES (role_id, perm_id, NOW());
        END IF;
      END LOOP;
      
      RAISE NOTICE 'REPORT_REVIEWER角色已分配權限';
    ELSE
      RAISE NOTICE 'REPORT_REVIEWER角色已有權限分配，跳過';
    END IF;
  ELSE
    RAISE NOTICE '找不到REPORT_REVIEWER角色';
  END IF;
END $$;

-- 為CUSTOMER_SERVICE角色分配權限
DO $$
DECLARE
  role_id UUID;
  perm_id UUID;
  perm_count INTEGER;
  perm_name TEXT;
  perm_names TEXT[] := ARRAY['view_tickets', 'create_tickets', 'view_reports', 'create_reports'];
BEGIN
  -- 獲取角色ID
  SELECT id INTO role_id FROM "Role" WHERE name = 'CUSTOMER_SERVICE' LIMIT 1;
  
  IF role_id IS NOT NULL THEN
    -- 檢查該角色是否已有權限
    EXECUTE 'SELECT COUNT(*) FROM "RolePermission" WHERE "roleId" = $1' INTO perm_count USING role_id;
    
    IF perm_count = 0 THEN
      -- 為角色分配權限
      FOREACH perm_name IN ARRAY perm_names LOOP
        SELECT id INTO perm_id FROM "Permission" WHERE name = perm_name LIMIT 1;
        
        IF perm_id IS NOT NULL THEN
          INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
          VALUES (role_id, perm_id, NOW());
        END IF;
      END LOOP;
      
      RAISE NOTICE 'CUSTOMER_SERVICE角色已分配權限';
    ELSE
      RAISE NOTICE 'CUSTOMER_SERVICE角色已有權限分配，跳過';
    END IF;
  ELSE
    RAISE NOTICE '找不到CUSTOMER_SERVICE角色';
  END IF;
END $$;

-- 為MAINTENANCE_WORKER角色分配權限
DO $$
DECLARE
  role_id UUID;
  perm_id UUID;
  perm_count INTEGER;
  perm_name TEXT;
  perm_names TEXT[] := ARRAY['view_tickets', 'claim_tickets', 'complete_tickets'];
BEGIN
  -- 獲取角色ID
  SELECT id INTO role_id FROM "Role" WHERE name = 'MAINTENANCE_WORKER' LIMIT 1;
  
  IF role_id IS NOT NULL THEN
    -- 檢查該角色是否已有權限
    EXECUTE 'SELECT COUNT(*) FROM "RolePermission" WHERE "roleId" = $1' INTO perm_count USING role_id;
    
    IF perm_count = 0 THEN
      -- 為角色分配權限
      FOREACH perm_name IN ARRAY perm_names LOOP
        SELECT id INTO perm_id FROM "Permission" WHERE name = perm_name LIMIT 1;
        
        IF perm_id IS NOT NULL THEN
          INSERT INTO "RolePermission" ("roleId", "permissionId", "assignedAt")
          VALUES (role_id, perm_id, NOW());
        END IF;
      END LOOP;
      
      RAISE NOTICE 'MAINTENANCE_WORKER角色已分配權限';
    ELSE
      RAISE NOTICE 'MAINTENANCE_WORKER角色已有權限分配，跳過';
    END IF;
  ELSE
    RAISE NOTICE '找不到MAINTENANCE_WORKER角色';
  END IF;
END $$;
