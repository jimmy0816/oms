import React, { useState, useCallback } from 'react';

// Define FileInfo interface
interface FileInfo {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  size?: number;
}

interface FileUploaderProps {
  onFilesChange: (files: FileInfo[]) => void;
  uploadFunction: (file: File) => Promise<FileInfo>;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFilesChange,
  uploadFunction,
  onUploadStart,
  onUploadEnd 
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    onUploadStart?.();

    try {
      const newFile = await uploadFunction(file);
      const updatedFiles = [...uploadedFiles, newFile];
      setUploadedFiles(updatedFiles);
      onFilesChange(updatedFiles);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || '上傳時發生錯誤');
    } finally {
      setUploading(false);
      onUploadEnd?.();
    }
  }, [onFilesChange, onUploadStart, onUploadEnd, uploadedFiles, uploadFunction]);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <label
        htmlFor="dropzone-file"
        className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg
            className="w-8 h-8 mb-4 text-gray-500"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 16"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
            />
          </svg>
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">點擊上傳</span> 或拖曳檔案到此處
          </p>
          <p className="text-xs text-gray-500">
            支援圖片及影片 (PNG, JPG, GIF, MP4, MOV)
          </p>
        </div>
        <input
          id="dropzone-file"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
          accept="image/*,video/*"
        />
      </label>
      {uploading && <p className="mt-2 text-sm text-blue-600">上傳中...</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default FileUploader;
