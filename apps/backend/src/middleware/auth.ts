import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth'; // Corrected import path
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { User } from '@/types/user';
import { Permission } from 'shared-types';
import { als } from '@/lib/als';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: User;
}

type NextApiHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

export const withAuth = (handler: NextApiHandler): NextApiHandler => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const session = await getServerSession(req, res, authOptions);

      console.log('backend session', session);

      if (!session || !session.user) {
        return res.status(401).json({ message: '未授權訪問，請先登入' });
      }

      req.user = session.user as User;

      await als.run({ actor: req.user }, async () => {
        await handler(req, res);
      });
    } catch (error) {
      console.error('Authentication error in withAuth:', error);
      res.status(500).json({ message: '伺服器內部錯誤' });
    }
  };
};

export const withPermission = (permission: Permission | Permission[]) => {
  return (handler: NextApiHandler): NextApiHandler => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'withPermission未授權訪問' });
      }

      const permissions = Array.isArray(permission) ? permission : [permission];
      const userPermissions: string[] = (user.permissions as string[]) || [];
      const hasAccess = permissions.some((p) => userPermissions.includes(p));

      if (!hasAccess) {
        return res.status(403).json({ message: '權限不足' });
      }

      return handler(req, res);
    });
  };
};
