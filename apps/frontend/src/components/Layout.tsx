import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  BellIcon, 
  TicketIcon, 
  UserIcon, 
  Cog6ToothIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { NotificationBadge } from './NotificationBadge';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavigationItem[];
}

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3); // 模擬未讀通知數量
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({}); // 追蹤展開的子選單

  const navigation = [
    { name: '儀表板', href: '/', icon: HomeIcon },
    { name: '工單管理', href: '/tickets', icon: ClipboardDocumentListIcon },
    { name: '通報中心', href: '/notifications', icon: BellIcon },
    { name: '通報管理', href: '/reports', icon: DocumentTextIcon },
    { 
      name: '系統管理', 
      href: '#', 
      icon: Cog6ToothIcon,
      children: [
        { name: '用戶管理', href: '/admin/users', icon: UserIcon },
        { name: '角色權限', href: '/admin/roles', icon: ShieldCheckIcon },
      ] 
    },
  ];

  const isActive = (path: string) => {
    if (path === '#') return false; // 父選單項目不會被標記為活動狀態
    if (path === '/' && router.pathname === '/') return true;
    if (path !== '/' && router.pathname.startsWith(path)) return true;
    return false;
  };
  
  // 檢查選單項目或其子項目是否處於活動狀態
  const hasActiveChild = (item: NavigationItem): boolean => {
    if (isActive(item.href)) return true;
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return false;
  };
  
  // 切換子選單的展開狀態
  const toggleSubMenu = (name: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#f7f9fb] text-[#18181b]">
      <Head>
        <title>OMS 原型 - 通報/工單/權限管理</title>
        <meta name="description" content="OMS 原型系統 - 通報、工單和權限管理" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css?family=Inter:400,600&display=swap" rel="stylesheet" />
      </Head>
      
      {/* 行動裝置選單按鈕 */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between bg-white px-4 border-b border-gray-100 md:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-xl">O</div>
          <span className="font-bold text-xl tracking-tight text-gray-900">OMS</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
        >
          {sidebarOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* 側邊欄：md 以上顯示 */}
      <aside className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex h-auto md:h-screen w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-gray-100 flex-col py-4 md:py-6 px-2 md:px-3 fixed top-14 left-0 right-0 bottom-0 md:static z-20`}>
        <div className="mb-8 hidden md:flex items-center gap-2 px-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-xl">O</div>
          <span className="font-bold text-xl tracking-tight text-gray-900">OMS</span>
        </div>
        <nav className="flex flex-col gap-2">
          {navigation.map((item) => {
            const isItemActive = hasActiveChild(item);
            const isExpanded = expandedMenus[item.name] || isItemActive;
            
            // 如果是有子選單的項目
            if (item.children) {
              return (
                <div key={item.name} className="flex flex-col">
                  <button
                    className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isItemActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => toggleSubMenu(item.name)}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </div>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </button>
                  
                  {/* 子選單 */}
                  {isExpanded && (
                    <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-gray-200 pl-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive(child.href)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <child.icon className="h-4 w-4 flex-shrink-0" />
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            // 一般選單項目
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-100 hidden md:block">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">管理員</p>
              <p className="text-xs text-gray-500">admin@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 主內容區 */}
      <main className="flex-1 pt-14 md:pt-0">
        {/* 頂部導航欄 */}
        <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 md:px-6 sticky top-0 z-10">
          <h1 className="text-lg font-medium">
            {navigation.find(item => isActive(item.href))?.name || '儀表板'}
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <BellIcon className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Link>
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center md:hidden">
              <UserIcon className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        </header>

        {/* 頁面內容 */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

