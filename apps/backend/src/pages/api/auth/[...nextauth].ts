import NextAuth, { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
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
          // Allow sign in for existing user
          return true;
        }
      }
      // For new users or credential provider, allow default sign-in behavior
      return true;
    },
    async redirect({ url, baseUrl }) {
      const frontendUrl = process.env.FRONTEND_BASE_URL;
      if (frontendUrl && url.startsWith(frontendUrl)) {
        return url;
      }
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      console.log('jwt', token, user);
      if (user) {
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
                          select: { name: true },
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

        token.id = user.id;
        token.role = (user as any).role;
        token.additionalRoles = additionalRoles;
        token.permissions = Array.from(permissions);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.additionalRoles = token.additionalRoles as string[];
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
