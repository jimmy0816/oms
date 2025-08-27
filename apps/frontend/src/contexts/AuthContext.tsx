import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { notificationService } from '@/services/notificationService';
import { Notification, Permission } from 'shared-types';
import { User } from '@/types/user'; // Assuming you have a User type that matches next-auth's user

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { data: session, status } = useSession();
  const user = session?.user as User | null;
  const loading = status === 'loading';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      return;
    }
    try {
      const fetchedNotifications = await notificationService.getNotifications();
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications();
    }
  }, [status, fetchNotifications]);

  const logout = () => {
    const logoutUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/login`;
    signOut({ callbackUrl: logoutUrl });
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user || !user.permissions) {
      return false;
    }
    return user.permissions.includes(permission);
  };

  const value = {
    user,
    loading,
    logout,
    hasPermission,
    notifications,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
