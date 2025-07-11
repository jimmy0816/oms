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
import { Notification } from 'shared-types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: () => boolean;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    const fetchedNotifications = await notificationService.getNotifications();
    setNotifications(fetchedNotifications);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        await fetchNotifications();
      }
      setLoading(false);
    };

    if (typeof window !== 'undefined') {
      initAuth();
    }
  }, [fetchNotifications]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      await fetchNotifications(); // Fetch notifications after login
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setNotifications([]); // Clear notifications on logout
    router.push('/login');
  };

  const markNotificationAsRead = async (id: string) => {
    const updatedNotification = await notificationService.markAsRead(id);
    if (updatedNotification) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    }
  };

  const markAllNotificationsAsRead = async () => {
    const result = await notificationService.markAllAsRead();
    if (result) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const isLoggedIn = () => authService.isLoggedIn();
  const hasRole = (role: string) => authService.hasRole(role);
  const isAdmin = () => authService.isAdmin();

  const value = {
    user,
    loading,
    login,
    logout,
    isLoggedIn,
    hasRole,
    isAdmin,
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
