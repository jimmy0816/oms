import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define enums locally to avoid shared-types dependency
enum TicketStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  VERIFIED = 'VERIFIED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
}

enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

interface SeededUsers {
  admin: { id: string };
  staff: { id: string };
  manager: { id: string };
  regularUser: { id: string };
}

export async function seedTickets(users: SeededUsers) {
  console.log('Seeding tickets...');

  // const ticket1 = await prisma.ticket.create({
  //   data: {
  //     title: '系統登入問題',
  //     description: '無法登入系統，顯示憑證錯誤',
  //     status: TicketStatus.PENDING,
  //     priority: TicketPriority.HIGH,
  //     creatorId: users.admin.id,
  //     assigneeId: users.staff.id,
  //   },
  // });

  // const ticket2 = await prisma.ticket.create({
  //   data: {
  //     title: '資料匯出功能異常',
  //     description: '匯出報表時發生錯誤，無法完成匯出操作',
  //     status: TicketStatus.IN_PROGRESS,
  //     priority: TicketPriority.MEDIUM,
  //     creatorId: users.admin.id,
  //     assigneeId: users.staff.id,
  //   },
  // });

  // const ticket3 = await prisma.ticket.create({
  //   data: {
  //     title: '新增使用者權限',
  //     description: '請為新進人員建立系統帳號並設定適當權限',
  //     status: TicketStatus.PENDING,
  //     priority: TicketPriority.LOW,
  //     creatorId: users.admin.id,
  //   },
  // });

  // console.log('Created sample tickets:', { ticket1: ticket1.id, ticket2: ticket2.id, ticket3: ticket3.id });
}
