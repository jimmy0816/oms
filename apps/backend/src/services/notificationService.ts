import { prisma } from '@/lib/prisma';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
}

export const notificationService = {
  /**
   * Creates a new notification.
   * @param data - The data for the notification.
   * @returns The created notification.
   */
  async create(data: NotificationData) {
    const { userId, title, message, relatedId, relatedType } = data;

    if (!userId || !title || !message) {
      throw new Error('Missing required fields for notification');
    }

    return prisma.notification.create({
      data: {
        userId,
        title,
        message,
        relatedId,
        relatedType,
      },
    });
  },

  /**
   * Finds notifications for a specific user.
   * @param userId - The ID of the user.
   * @returns A list of notifications.
   */
  async findByUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Marks a single notification as read.
   * @param id - The ID of the notification.
   * @param userId - The ID of the user, for authorization.
   * @returns The updated notification.
   */
  async markAsRead(id: string, userId: string) {
    // First, verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error(
        'Notification not found or you do not have permission to view it.'
      );
    }

    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  },

  /**
   * Marks all unread notifications for a user as read.
   * @param userId - The ID of the user.
   * @returns A batch payload containing the count of updated notifications.
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  },
};
