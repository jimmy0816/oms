import { PrismaClient } from '@prisma/client';
import { locations } from './data/locations.js';

export async function seedLocations(prisma: PrismaClient) {
  console.log(`Start seeding locations ...`);

  const result = await prisma.location.createMany({
    data: locations,
    skipDuplicates: true,
  });

  console.log(`Seeding finished. ${result.count} locations were created.`);
}
