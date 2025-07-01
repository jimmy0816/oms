import { PrismaClient } from '../dist';
import * as bcrypt from 'bcryptjs';

// Define enums locally to avoid shared-types dependency
enum TicketStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  VERIFIED = 'VERIFIED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED'
}

enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

const prisma = new PrismaClient();

// 密碼加密函數
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  // 加密密碼
  const adminPassword = await hashPassword('admin123');
  const staffPassword = await hashPassword('staff123');
  const managerPassword = await hashPassword('manager123');
  const userPassword = await hashPassword('user123');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPassword // 更新密碼
    },
    create: {
      email: 'admin@example.com',
      name: '管理員',
      role: 'ADMIN',
      password: adminPassword // 添加密碼
    },
  });

  console.log('Created admin user:', admin);

  // Create staff user
  const staff = await prisma.user.upsert({
    where: { email: 'staff@example.com' },
    update: {
      password: staffPassword // 更新密碼
    },
    create: {
      email: 'staff@example.com',
      name: '工作人員',
      role: 'STAFF',
      password: staffPassword // 添加密碼
    },
  });

  console.log('Created staff user:', staff);

  // Create manager user
  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {
      password: managerPassword
    },
    create: {
      email: 'manager@example.com',
      name: '經理',
      role: 'MANAGER',
      password: managerPassword
    },
  });

  console.log('Created manager user:', manager);

  // Create regular user
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      password: userPassword
    },
    create: {
      email: 'user@example.com',
      name: '一般用戶',
      role: 'USER',
      password: userPassword
    },
  });

  console.log('Created regular user:', regularUser);

  // Create some sample tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      title: '系統登入問題',
      description: '無法登入系統，顯示憑證錯誤',
      status: 'PENDING',
      priority: 'HIGH',
      creatorId: admin.id,
      assigneeId: staff.id,
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: '資料匯出功能異常',
      description: '匯出報表時發生錯誤，無法完成匯出操作',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      creatorId: admin.id,
      assigneeId: staff.id,
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      title: '新增使用者權限',
      description: '請為新進人員建立系統帳號並設定適當權限',
      status: 'PENDING',
      priority: 'LOW',
      creatorId: admin.id,
    },
  });

  console.log('Created sample tickets:', { ticket1, ticket2, ticket3 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
