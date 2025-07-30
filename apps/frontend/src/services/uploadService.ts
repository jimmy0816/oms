import apiClient from '@/lib/apiClient';



export const uploadService = {
  async getUploadUrl(
    fileName: string,
    fileType: string,
    module: 'reports' | 'tickets' | 'general'
  ): Promise<{ signedUrl: string; fileUrl: string; fileId: string }> {
    try {
      const result = await apiClient.post<{ signedUrl: string; fileUrl: string; fileId: string }>('/api/upload-url', {
        fileName,
        fileType,
        module,
      });
      return result;
    } catch (error) {
      console.error('獲取上傳 URL 失敗:', error);
      throw error;
    }
  },
};
