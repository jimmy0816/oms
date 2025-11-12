import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      primaryRole: any; // Replace with a proper Role type if you have one
      additionalRoles: any[]; // Replace with a proper Role type if you have one
      permissions: string[];
      isOidcLinked?: boolean;
      id_token?: string;
    } & DefaultSession['user'];
  }

  interface User {
    primaryRole: any;
    additionalRoles: any[];
    permissions: string[];
    isOidcLinked?: boolean;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id: string;
    primaryRole: any;
    additionalRoles: any[];
    permissions: string[];
    isOidcLinked?: boolean;
    id_token?: string;
  }
}
