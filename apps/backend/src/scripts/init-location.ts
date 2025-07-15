import { prisma } from '@/lib/prisma';
import { locations } from '@/data/locations';

export async function seedLocations() {
  console.log(`Start seeding locations ...`);

  const result = await prisma.location.createMany({
    data: locations,
    skipDuplicates: true,
  });

  console.log(`Seeding finished. ${result.count} locations were created.`);
}
