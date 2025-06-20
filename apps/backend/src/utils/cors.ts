import Cors from 'cors';
import { NextApiRequest, NextApiResponse } from 'next';

// CORS 配置
const cors = Cors({
  origin: ['http://localhost:8080', 'http://frontend:8080'], // 允許的來源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允許的 HTTP 方法
  credentials: true, // 允許帶憑證的請求
  allowedHeaders: ['Content-Type', 'Authorization'], // 允許的請求頭
});

// 中間件執行器
export function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// CORS 中間件
export async function applyCors(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors);
}
