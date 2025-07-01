import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

type User = {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

const JWT_SECRET = process.env.JWT_SECRET || 'local_development_secret';
const SALT_ROUNDS = 10;

/**
 * 密碼加密
 * @param password 明文密碼
 * @returns 加密後的密碼
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * 驗證密碼
 * @param password 明文密碼
 * @param hashedPassword 加密後的密碼
 * @returns 是否匹配
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * 生成 JWT Token
 * @param user 用戶資訊
 * @returns JWT Token
 */
export const generateToken = (user: Omit<User, 'password'>): string => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * 驗證 JWT Token
 * @param token JWT Token
 * @returns 解析後的用戶資訊
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * 從請求中獲取用戶資訊
 * @param req 請求對象
 * @returns 用戶資訊
 */
export const getUserFromRequest = (req: any): any => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return verifyToken(token);
  } catch (error) {
    return null;
  }
};
