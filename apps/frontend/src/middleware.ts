import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { publicRoutes as PUBLIC_PATHS } from '@/config/routes';

// 從環境變數讀取 JWT secret，或使用一個預設值
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 2. 檢查請求的路徑是否為公開路徑
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    // 如果是公開路徑，則直接放行
    return NextResponse.next();
  }

  // 3. 從 cookie 中獲取 token
  const token = req.cookies.get('token')?.value;

  if (!token) {
    // 4. 如果沒有 token 且試圖訪問受保護的頁面，則重定向到登入頁
    const loginUrl = new URL('/login', req.url);
    // 將原始請求的頁面作為查詢參數，以便登入後可以跳轉回來
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. 如果有 token，可以選擇性地進行驗證 (這裡暫時省略以保持 middleware 輕量)
  // 在實際產品中，您可能會想在此處使用 jose 或類似的庫來驗證 token 的有效性。
  // 如果驗證失敗，同樣重定向到登入頁。

  // 6. 如果一切正常，放行請求
  return NextResponse.next();
}

// 7. 設定 middleware 的作用範圍
export const config = {
  matcher: [
    /*
     * 匹配除了以下路徑之外的所有請求路徑：
     * - api (API 路由)
     * - _next/static (靜態檔案)
     * - _next/image (圖片優化檔案)
     * - favicon.ico (網站圖標)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
