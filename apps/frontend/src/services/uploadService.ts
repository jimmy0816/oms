const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

const getAuthHeaders = (): HeadersInit => {
  if (typeof window === 'undefined')
    return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  const headeres: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headeres.Authorization = `Bearer ${token}`;
  }
  return headeres;
};

export const uploadService = {
  async getUploadUrl(
    fileName: string,
    fileType: string,
    module: 'reports' | 'tickets' | 'general'
  ): Promise<{ signedUrl: string; fileUrl: string; fileId: string }> {
    try {
      const response = await fetch(`${API_URL}/upload-url`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ fileName, fileType, module }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '獲取上傳 URL 失敗');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('獲取上傳 URL 失敗:', error);
      throw error;
    }
  },
};
