/**
 * 用戶類型定義
 */
export interface User {
  id: string;
  email: string;
  name: string;
  primaryRole: any; // Can be a more specific Role type
  additionalRoles?: any[]; // Can be a more specific Role type
  permissions?: string[];
  isOidcLinked?: boolean;
  id_token?: string;
  createdAt?: string;
  updatedAt?: string;
}
