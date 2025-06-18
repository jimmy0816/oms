-- 添加測試用戶
INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
VALUES 
('1', 'admin@example.com', '管理員', 'ADMIN', NOW(), NOW()),
('2', 'staff@example.com', '工作人員', 'STAFF', NOW(), NOW()),
('3', 'user@example.com', '一般用戶', 'USER', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 添加測試通報
INSERT INTO "Report" (id, title, description, status, priority, category, location, "createdAt", "updatedAt", "creatorId", "assigneeId", images, "contactPhone", "contactEmail")
VALUES
('1', '設備故障報告', '三樓茶水間的飲水機無法正常供應熱水，請儘快維修。', 'PENDING', 'MEDIUM', 'FACILITY', '三樓茶水間', NOW(), NOW(), '3', '2', '{"https://picsum.photos/id/1/800/600"}', '0912345678', 'user@example.com'),
('2', '安全隱患報告', '地下停車場B區的消防通道被雜物堵塞，存在安全隱患。', 'PROCESSING', 'HIGH', 'SECURITY', '地下停車場B區', NOW(), NOW(), '2', '1', '{"https://picsum.photos/id/2/800/600"}', '0923456789', 'staff@example.com'),
('3', '環境問題報告', '辦公區域空調溫度過低，許多同事反映感到寒冷。', 'RESOLVED', 'LOW', 'ENVIRONMENT', '2樓辦公區', NOW(), NOW(), '3', '2', '{"https://picsum.photos/id/3/800/600"}', '0934567890', 'user@example.com'),
('4', '服務投訴', '餐廳午餐質量下降，多人反映食物不新鮮。', 'REJECTED', 'URGENT', 'SERVICE', '1樓餐廳', NOW(), NOW(), '2', NULL, '{"https://picsum.photos/id/4/800/600"}', '0945678901', 'staff@example.com'),
('5', '其他問題報告', '公司網站首頁加載緩慢，影響客戶體驗。', 'PENDING', 'MEDIUM', 'OTHER', 'IT部門', NOW(), NOW(), '1', '2', '{}', '0956789012', 'admin@example.com')
ON CONFLICT (id) DO NOTHING;

-- 添加測試評論
INSERT INTO "Comment" (id, content, "createdAt", "updatedAt", "reportId", "userId")
VALUES
('1', '已安排維修人員前往處理。', NOW(), NOW(), '1', '2'),
('2', '維修完成，請確認是否恢復正常。', NOW(), NOW(), '1', '2'),
('3', '已通知保安清理消防通道。', NOW(), NOW(), '2', '1'),
('4', '問題已解決，空調溫度已調整。', NOW(), NOW(), '3', '2')
ON CONFLICT (id) DO NOTHING;

-- 添加測試通知
INSERT INTO "Notification" (id, title, message, "isRead", "createdAt", "userId", "relatedReportId")
VALUES
('1', '新通報已分配給您', '您被分配處理通報：設備故障報告', FALSE, NOW(), '2', '1'),
('2', '通報狀態更新', '您提交的通報已開始處理', TRUE, NOW(), '3', '1'),
('3', '新評論', '您的通報有新評論', FALSE, NOW(), '3', '1')
ON CONFLICT (id) DO NOTHING;
