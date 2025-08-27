import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from 'next-auth/react';
import { notificationService } from '@/services/notificationService';
import { Notification, Permission } from 'shared-types';
import { User } from '@/types/user'; // Assuming you have a User type that matches next-auth's user

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // login: (email: string, password: string, returnUrl?: string) => Promise<void>; // Removed as signIn is called directly
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

  // The login function is now handled directly in login.tsx by calling signIn.
  // This placeholder is kept for AuthContextType compatibility if needed elsewhere.
  const login = async (email: string, password: string, returnUrl?: string) => {
    // This function should ideally not be called directly anymore for login.
    // Login is handled by signIn('credentials', ...) in login.tsx
    console.warn(
      'AuthContext.login should not be called directly for login. Use signIn from next-auth/react.'
    );
    throw new Error('AuthContext.login is deprecated for direct login calls.');
  };

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
    login,
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
