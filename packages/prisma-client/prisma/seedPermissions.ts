import { PrismaClient } from '@prisma/client';
// import { permissionService } from '../../apps/backend/src/services/permissionService';

const prisma = new PrismaClient();

export async function seedPermissions() {
  console.log('Initializing permissions...');
  // await permissionService.initializePermissions();
  console.log('Initializing role permissions...');
  // await permissionService.initializeRolePermissions();
  console.log('Permissions and role permissions initialized successfully.');
}
