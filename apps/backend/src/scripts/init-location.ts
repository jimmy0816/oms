import { prisma } from '@/lib/prisma';
import { locations } from '@/data/locations';

export async function seedLocations() {
  console.log(`Start seeding locations ...`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const locationData of locations) {
    try {
      const existingLocation = await prisma.location.findUnique({
        where: { name: locationData.name },
      });

      if (existingLocation) {
        // 如果地點已存在，檢查並更新 externalId
        if (existingLocation.externalId !== locationData.id) {
          await prisma.location.update({
            where: { id: existingLocation.id },
            data: { externalId: locationData.id },
          });
          updatedCount++;
          console.log(
            `Updated location: ${locationData.name} (externalId: ${locationData.id})`
          );
        } else {
          console.log(
            `Location already exists and externalId is up-to-date: ${locationData.name}`
          );
        }
      } else {
        // 如果地點不存在，則創建新地點
        await prisma.location.create({
          data: {
            name: locationData.name,
            externalId: locationData.id, // 將舊的數字 ID 儲存到 externalId
          },
        });
        createdCount++;
        console.log(
          `Created new location: ${locationData.name} (externalId: ${locationData.id})`
        );
      }
    } catch (error) {
      console.error(`Error seeding location ${locationData.name}:`, error);
    }
  }

  console.log(
    `Seeding finished. Created: ${createdCount}, Updated: ${updatedCount} locations.`
  );
}
