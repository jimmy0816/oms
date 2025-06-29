import { NextApiRequest, NextApiResponse } from 'next';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

export function withApiHandler(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // 集中處理 OPTIONS 預檢請求
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      // 執行真正的 API 業務邏輯
      await handler(req, res);
    } catch (error: any) {
      // 集中處理未捕獲的錯誤
      console.error('Unhandled error in API handler:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred',
      });
    }
  };
}
