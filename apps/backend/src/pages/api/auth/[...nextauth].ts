import NextAuth, { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// Function to refresh the access token
async function refreshAccessToken(token: any) {
  try {
    // Use the wellKnown endpoint to get the token_endpoint
    const wellKnownResponse = await fetch(
      `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`
    );
    const wellKnownConfig = await wellKnownResponse.json();
    const tokenEndpoint = wellKnownConfig.token_endpoint;

    if (!tokenEndpoint) {
      throw new Error(
        'Token endpoint not found in OIDC well-known configuration'
      );
    }

    const response = await fetch(tokenEndpoint, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.OIDC_CLIENT_ID as string,
        client_secret: process.env.OIDC_CLIENT_SECRET as string,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      id_token: refreshedTokens.id_token ?? token.id_token,
    };
  } catch (error) {
    console.error('Error refreshing access token', error);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

const cookiePrefix = 'oms-';

export const authOptions: NextAuthOptions = {
  url: process.env.NEXTAUTH_URL,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('請輸入信箱和密碼');
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email, deletedAt: null },
        });
        if (!user || !user.password) {
          throw new Error('信箱與密碼錯誤');
        }
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) {
          throw new Error('信箱與密碼錯誤');
        }
        return user;
      },
    }),
    {
      id: 'oidc',
      name: 'OIDC Provider',
      type: 'oauth',
      wellKnown: `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`,
      userinfo: {
        url: `${process.env.OIDC_ISSUER}/me`,
        async request(context) {
          const { tokens, provider } = context;
          const userInfoUrl = provider.userinfo?.url;
          if (!userInfoUrl) {
            throw new Error('Userinfo URL not found in provider configuration');
          }
          const response = await fetch(userInfoUrl, {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });
          return await response.json();
        },
      },
      authorization: { params: { scope: 'openid email profile' } },
      idToken: true,
      checks: ['pkce', 'state'],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
      clientId: process.env.OIDC_CLIENT_ID as string,
      clientSecret: process.env.OIDC_CLIENT_SECRET as string,
    },
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.type === 'oauth') {
        // Check if a user with the same email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email as string },
        });

        if (existingUser) {
          // If the user exists, check if an account for this provider already exists
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (!existingAccount) {
            // If no account exists for this provider, link the new OAuth account to the existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            });
          }
          // Update isOidcLinked for the existing user
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { isOidcLinked: true },
          });
          // Allow sign in for existing user
          return true;
        }
      }
      // For new users or credential provider, allow default sign-in behavior
      return true;
    },
    async redirect({ url, baseUrl }) {
      const frontendUrl = process.env.PUBLIC_FRONTEND_URL;
      if (frontendUrl && url.startsWith(frontendUrl)) {
        return url;
      }
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      return baseUrl;
    },
    async jwt({ token, user, account }) {
      // Initial sign in: user and account are available
      if (user && account) {
        // Fetch dbUser and permissions only once during initial sign-in
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            userRoles: {
              select: {
                role: {
                  select: {
                    name: true,
                    rolePermissions: {
                      select: {
                        permission: {
                          select: {
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const permissions = new Set<string>();
        const additionalRoles: string[] = [];

        if (dbUser?.userRoles) {
          dbUser.userRoles.forEach((userRole) => {
            additionalRoles.push(userRole.role.name);
            userRole.role.rolePermissions.forEach((p) => {
              permissions.add(p.permission.name);
            });
          });
        }

        return {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 60 * 60 * 24 * 30 * 1000, // Default to 30 days from now if not provided
          id_token: account.id_token,
          id: user.id, // Store id at root
          email: user.email, // Store email at root
          name: user.name, // Store name at root
          isOidcLinked: (user as any).isOidcLinked, // Store isOidcLinked at root
          role: (dbUser as any)?.role, // Store role at root
          additionalRoles: additionalRoles, // Store additionalRoles at root
          permissions: Array.from(permissions), // Store permissions at root
        };
      }

      // Subsequent calls: user and account are not available, only token
      // Check if access token is expired
      if (
        token.accessTokenExpires &&
        typeof token.accessTokenExpires === 'number' &&
        Date.now() < token.accessTokenExpires
      ) {
        return token; // Token is still valid
      }

      // Access token has expired, try to refresh it
      const refreshedToken = await refreshAccessToken(token);

      // If refresh failed, return the token with error
      if (refreshedToken.error) {
        return refreshedToken;
      }

      // Return the refreshed token (which already contains all user data from initial sign-in)
      return refreshedToken;
    },
    async session({ session, token }) {
      console.log('Session callback - token:', token);
      if (token.error === 'RefreshAccessTokenError') {
        // If there was an error refreshing the access token,
        // invalidate the session to force re-login.
        return { ...session, error: 'RefreshAccessTokenError' };
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.additionalRoles = token.additionalRoles as string[];
        session.user.permissions = token.permissions as string[];
        session.user.isOidcLinked = token.isOidcLinked as boolean;
        session.user.id_token = token.id_token as string;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
        maxAge: 900,
      },
    },
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
        maxAge: 900,
      },
    },
    nonce: {
      name: `${cookiePrefix}next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
