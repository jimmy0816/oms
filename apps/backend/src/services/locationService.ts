import { prisma } from '@/lib/prisma';
import { Location } from 'shared-types'; // Corrected import

export const locationService = {
  /**
   * 獲取所有空間列表，包含已啟用和未啟用的。
   * 用於管理頁面。
   */
  async getAllLocations(): Promise<Location[]> {
    return prisma.location.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  },

  /**
   * 獲取所有已啟用的空間列表。
   * 用於篩選器。
   */
  async getActiveLocations(): Promise<Location[]> {
    return prisma.location.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  },

  /**
   * 創建新空間。
   */
  async createLocation(data: { name: string; externalId?: number }): Promise<Location> {
    const { name, externalId } = data;
    // 獲取當前最大的 sortOrder，新空間排在最後
    const maxSortOrder = await prisma.location.aggregate({
      _max: { sortOrder: true },
    });
    const newSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    try {
      return await prisma.location.create({
        data: {
          name,
          externalId,
          active: true, // 預設為啟用
          sortOrder: newSortOrder,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new Error('空間名稱已存在。');
      }
      throw error;
    }
  },

  /**
   * 更新空間資訊。
   * 包含名稱、啟用狀態和排序。
   */
  async updateLocation(
    id: string,
    data: { name?: string; active?: boolean; sortOrder?: number }
  ): Promise<Location> {
    try {
      return await prisma.location.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new Error('空間名稱已存在。');
      }
      throw error;
    }d
  },

  /**
   * 刪除空間。
   * 檢查是否有關聯的通報。
   */
  async deleteLocation(id: string): Promise<void> {
    const reportCount = await prisma.report.count({
      where: { locationId: id },
    });

    if (reportCount > 0) {
      throw new Error('此空間尚有關聯的通報，無法刪除。');
    }

    await prisma.location.delete({ where: { id } });
  },

  /**
   * 重新排序空間。
   */
  async reorderLocations(updates: { id: string; sortOrder: number }[]): Promise<void> {
    const transactions = updates.map(update =>
      prisma.location.update({
        where: { id: update.id },
        data: { sortOrder: update.sortOrder },
      })
    );
    await prisma.$transaction(transactions);
  },
};

export default locationService;