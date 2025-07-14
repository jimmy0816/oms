import { PrismaClient } from '@prisma/client';
import { seedCategories } from './seedCategories';
import { seedUsers } from './seedUsers';
import { seedTickets } from './seedTickets';
import { seedPermissions } from './seedPermissions';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Seed permissions and roles first as they are dependencies for users
  // await seedPermissions();

  // Seed users and get their IDs for tickets
  // const users = await seedUsers();

  // Seed categories
  await seedCategories(prisma);

  // Seed tickets, depending on users
  // await seedTickets(users);

  console.log('Database seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
