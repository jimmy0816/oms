import { NextApiRequest, NextApiResponse } from 'next';
import { seedBotUser } from '@/scripts/init-bot';

/**
 * 初始化管理員帳號
 * @param req 請求對象
 * @param res 響應對象
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允許 GET 請求
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: '方法不允許' });
  }

  try {
    await seedBotUser();
    return res.status(200).json({ success: true, message: '初始化BOT成功' });
  } catch (error) {
    console.error('初始化過程中發生錯誤:', error);
    return res.status(500).json({ success: false, error: '初始化失敗' });
  }
}

export default handler;
