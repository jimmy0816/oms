import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Webhook 接收端點
 * @param req 請求對象
 * @param res 響應對象
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '僅支援 POST 方法' });
  }

  try {
    console.log('=== 收到 Webhook 請求 ===');
    console.log('時間:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('========================\n');

    // 回傳成功訊息
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook 已接收',
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('處理 Webhook 時發生錯誤:', error);
    return res.status(500).json({ 
      success: false, 
      error: '處理 Webhook 失敗' 
    });
  }
}

export default handler;
