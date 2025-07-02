// // 數據庫種子腳本 - 添加初始數據
// // 使用相對路徑導入 Prisma 客戶端
// // const { PrismaClient } = require('../../node_modules/.prisma/client');
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// async function main() {
//   console.log('開始添加初始數據...');

//   // 創建測試用戶
//   const adminUser = await prisma.user.upsert({
//     where: { email: 'admin@example.com' },
//     update: {},
//     create: {
//       email: 'admin@example.com',
//       name: '管理員',
//       // password: 'admin123', // 在實際應用中應該使用加密密碼
//       role: 'ADMIN',
//     },
//   });

//   const staffUser = await prisma.user.upsert({
//     where: { email: 'staff@example.com' },
//     update: {},
//     create: {
//       email: 'staff@example.com',
//       name: '工作人員',
//       // password: 'staff123',
//       role: 'STAFF',
//     },
//   });

//   const userUser = await prisma.user.upsert({
//     where: { email: 'user@example.com' },
//     update: {},
//     create: {
//       email: 'user@example.com',
//       name: '一般用戶',
//       // password: 'user123',
//       role: 'USER',
//     },
//   });

//   console.log('已創建測試用戶:', { adminUser, staffUser, userUser });

//   // 創建測試通報
//   const reports = [
//     {
//       title: '設備故障報告',
//       description: '三樓茶水間的飲水機無法正常供應熱水，請儘快維修。',
//       status: 'PENDING',
//       priority: 'MEDIUM',
//       category: 'FACILITY',
//       location: '三樓茶水間',
//       creatorId: userUser.id,
//       assigneeId: staffUser.id,
//       images: ['https://picsum.photos/id/1/800/600'],
//       contactPhone: '0912345678',
//       contactEmail: 'user@example.com',
//     },
//     {
//       title: '安全隱患報告',
//       description: '地下停車場B區的消防通道被雜物堵塞，存在安全隱患。',
//       status: 'PROCESSING',
//       priority: 'HIGH',
//       category: 'SECURITY',
//       location: '地下停車場B區',
//       creatorId: staffUser.id,
//       assigneeId: adminUser.id,
//       images: ['https://picsum.photos/id/2/800/600'],
//       contactPhone: '0923456789',
//       contactEmail: 'staff@example.com',
//     },
//     {
//       title: '環境問題報告',
//       description: '辦公區域空調溫度過低，許多同事反映感到寒冷。',
//       status: 'RESOLVED',
//       priority: 'LOW',
//       category: 'ENVIRONMENT',
//       location: '2樓辦公區',
//       creatorId: userUser.id,
//       assigneeId: staffUser.id,
//       images: ['https://picsum.photos/id/3/800/600'],
//       contactPhone: '0934567890',
//       contactEmail: 'user@example.com',
//     },
//     {
//       title: '服務投訴',
//       description: '餐廳午餐質量下降，多人反映食物不新鮮。',
//       status: 'REJECTED',
//       priority: 'URGENT',
//       category: 'SERVICE',
//       location: '1樓餐廳',
//       creatorId: staffUser.id,
//       images: ['https://picsum.photos/id/4/800/600'],
//       contactPhone: '0945678901',
//       contactEmail: 'staff@example.com',
//     },
//     {
//       title: '其他問題報告',
//       description: '公司網站首頁加載緩慢，影響客戶體驗。',
//       status: 'PENDING',
//       priority: 'MEDIUM',
//       category: 'OTHER',
//       location: 'IT部門',
//       creatorId: adminUser.id,
//       assigneeId: staffUser.id,
//       contactPhone: '0956789012',
//       contactEmail: 'admin@example.com',
//     },
//   ];

//   // 批量創建通報
//   const createdReports = await Promise.all(
//     reports.map((report) =>
//       prisma.report.create({
//         data: report,
//       })
//     )
//   );

//   console.log(`已創建 ${createdReports.length} 個測試通報`);

//   // 為部分通報添加評論
//   const comments = [
//     {
//       content: '已安排維修人員前往處理。',
//       reportId: createdReports[0].id,
//       userId: staffUser.id,
//     },
//     {
//       content: '維修完成，請確認是否恢復正常。',
//       reportId: createdReports[0].id,
//       userId: staffUser.id,
//     },
//     {
//       content: '已通知保安清理消防通道。',
//       reportId: createdReports[1].id,
//       userId: adminUser.id,
//     },
//     {
//       content: '問題已解決，空調溫度已調整。',
//       reportId: createdReports[2].id,
//       userId: staffUser.id,
//     },
//   ];

//   const createdComments = await Promise.all(
//     comments.map((comment) =>
//       prisma.comment.create({
//         data: comment,
//       })
//     )
//   );

//   console.log(`已創建 ${createdComments.length} 個測試評論`);

//   // 創建一些通知
//   const notifications = [
//     {
//       title: '新通報已分配給您',
//       message: `您被分配處理通報：${createdReports[0].title}`,
//       userId: staffUser.id,
//       relatedReportId: createdReports[0].id,
//       isRead: false,
//     },
//     {
//       title: '通報狀態更新',
//       message: '您提交的通報已開始處理',
//       userId: userUser.id,
//       relatedReportId: createdReports[0].id,
//       isRead: true,
//     },
//     {
//       title: '新評論',
//       message: '您的通報有新評論',
//       userId: userUser.id,
//       relatedReportId: createdReports[0].id,
//       isRead: false,
//     },
//   ];

//   const createdNotifications = await Promise.all(
//     notifications.map((notification) =>
//       prisma.notification.create({
//         data: notification,
//       })
//     )
//   );

//   console.log(`已創建 ${createdNotifications.length} 個測試通知`);

//   console.log('初始數據添加完成！');
// }

// main()
//   .catch((e) => {
//     console.error('初始數據添加失敗:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
