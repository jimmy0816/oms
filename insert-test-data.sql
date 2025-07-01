-- Insert test users
INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
VALUES 
  (1, 'admin@example.com', '管理員', 'ADMIN', NOW(), NOW()),
  (2, 'staff@example.com', '工作人員', 'STAFF', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  "updatedAt" = NOW();

-- Insert test tickets
INSERT INTO "Ticket" (
  id,
  title, 
  description, 
  status, 
  priority, 
  "creatorId", 
  "assigneeId", 
  "createdAt", 
  "updatedAt"
)
VALUES (
  1,
  '系統登入問題',
  '無法登入系統，顯示憑證錯誤',
  'PENDING',
  'HIGH',
  1,
  2,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  "updatedAt" = NOW();

-- Insert another ticket
INSERT INTO "Ticket" (
  id,
  title, 
  description, 
  status, 
  priority, 
  "creatorId", 
  "createdAt", 
  "updatedAt"
)
VALUES (
  2,
  '資料匯出功能異常',
  '匯出報表時發生錯誤，無法完成匯出操作',
  'IN_PROGRESS',
  'MEDIUM',
  1,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  "updatedAt" = NOW();
