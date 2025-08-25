import { PrismaClient } from '@prisma/client';
import { Permission } from 'shared-types';

const prisma = new PrismaClient();

async function syncPermissions() {
  console.log('Starting permission synchronization...');

  try {
    // 1. Get all permissions defined in the code (from the enum)
    const codePermissions = Object.values(Permission) as string[];
    console.log(`Found ${codePermissions.length} permissions defined in code.`);

    // 2. Get all permissions currently in the database
    const dbPermissions = await prisma.permission.findMany({
      select: {
        name: true,
      },
    });
    const dbPermissionNames = dbPermissions.map((p) => p.name);
    console.log(
      `Found ${dbPermissionNames.length} permissions in the database.`
    );

    // 3. Find which permissions are in code but not in the database
    const newPermissionNames = codePermissions.filter(
      (p) => !dbPermissionNames.includes(p)
    );

    if (newPermissionNames.length === 0) {
      console.log(
        'Database permissions are already up-to-date. No changes needed.'
      );
      return;
    }

    console.log(`Found ${newPermissionNames.length} new permissions to add:`);
    newPermissionNames.forEach((p) => console.log(`  - ${p}`));

    // 4. Prepare the data for the new permissions
    const dataToCreate = newPermissionNames.map((name) => ({
      name: name, // The unique name from the enum
      description: name.toUpperCase(), // Auto-generate a description
    }));

    // 5. Add the new permissions to the database
    const result = await prisma.permission.createMany({
      data: dataToCreate,
    });

    console.log(
      `Successfully added ${result.count} new permissions to the database.`
    );
  } catch (error) {
    console.error(
      'An error occurred during permission synchronization:',
      error
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Synchronization finished.');
  }
}

syncPermissions();
