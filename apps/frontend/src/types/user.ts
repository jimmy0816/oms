/**
 * 用戶類型定義
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  additionalRoles?: string[];
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}
