import Cors from 'cors';
import { NextApiRequest, NextApiResponse } from 'next';

// CORS 配置
const cors = Cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://frontend:8080',
  ], // 加入前端本地開發網址
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
  console.log('applyCors called for', req.url);
  res.setHeader(
    'Access-Control-Allow-Origin',
    process.env.PUBLIC_FRONTEND_URL || '*'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  await runMiddleware(req, res, cors);
}
