import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter } from 'next/router';
import authService, { User } from '@/services/authService';
import { notificationService } from '@/services/notificationService';
import { Notification, Permission } from 'shared-types'; // Import Permission

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean; // New permission checker
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    if (!authService.isLoggedIn()) return;
    try {
      const fetchedNotifications = await notificationService.getNotifications();
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]); // Clear notifications on error
    }
  }, []);

  const initAuth = useCallback(async () => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      await fetchNotifications();
    }
    setLoading(false);
  }, [fetchNotifications]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      initAuth();
    }
  }, [initAuth]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      await fetchNotifications();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setNotifications([]);
    router.push('/login');
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // --- New Permission-Based Checker ---
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
    hasPermission, // Use the new function
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
