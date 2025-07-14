import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Password hashing function
// async function hashPassword(password: string): Promise<string> {
//   const salt = await bcrypt.genSalt(10);
//   return bcrypt.hash(password, salt);
// }

export async function seedUsers() {}
