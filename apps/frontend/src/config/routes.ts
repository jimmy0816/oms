import { Permission } from 'shared-types';

interface RouteConfig {
  [key: string]: Permission | undefined; // undefined means public page
}

export const routePermissions: RouteConfig = {
  '/': undefined, // Dashboard, might not need specific permission, just logged in
  '/tickets': Permission.VIEW_TICKETS,
  '/tickets/new': Permission.CREATE_TICKETS,
  '/tickets/[id]': Permission.VIEW_TICKETS,
  '/tickets/[id]/edit': Permission.EDIT_TICKETS,
  '/reports': Permission.VIEW_REPORTS,
  '/reports/new': Permission.CREATE_REPORTS,
  '/reports/[id]': Permission.VIEW_REPORTS,
  '/reports/[id]/edit': Permission.EDIT_REPORTS,
  '/admin/tickets': Permission.VIEW_REPORTS,
  '/admin/users': Permission.VIEW_USERS,
  '/admin/roles': Permission.MANAGE_ROLES,
  '/notifications': undefined, // Notifications page, might just need login
  '/user/profile': undefined, // User profile page, might just need login
  // Add other routes as needed
};

export const publicRoutes = ['/login', '/lost-and-found'];
