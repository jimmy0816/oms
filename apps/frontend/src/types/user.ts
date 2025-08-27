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
  isOidcLinked?: boolean; // Added to indicate if the account is linked to OIDC
  createdAt?: string;
  updatedAt?: string;
}
