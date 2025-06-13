import React, { useState, useRef } from 'react';
import { 
  PhotoIcon,
  XMarkIcon,
  FilmIcon
} from '@heroicons/react/24/outline';

// 定義上傳檔案類型
export interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  name: string;
  size?: number;
  url?: string;
}

interface FileUploaderProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  label?: string;
  helpText?: string;
  viewOnly?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  files,
  onFilesChange,
  maxFiles = 10,
  acceptedFileTypes = ['image/*', 'video/*'],
  label = '選擇圖片或影片',
  helpText = '支援 JPG, PNG, GIF, MP4 等格式',
  viewOnly = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 處理檔案上傳
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // 檢查是否超過最大檔案數
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`最多只能上傳 ${maxFiles} 個檔案`);
      return;
    }

    // 處理每個選擇的檔案
    const newFiles: UploadedFile[] = [];
    
    Array.from(selectedFiles).forEach(file => {
      // 檢查檔案類型
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        alert('只支援圖片和影片檔案');
        return;
      }

      // 建立預覽 URL
      const previewUrl = URL.createObjectURL(file);
      
      // 新增到上傳檔案列表
      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        previewUrl,
        type: isImage ? 'image' : 'video',
        name: file.name,
        size: file.size
      });
    });
    
    onFilesChange([...files, ...newFiles]);
    
    // 清空 input 值，允許重複上傳相同檔案
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 移除上傳的檔案
  const removeFile = (id: string) => {
    const updatedFiles = files.filter(file => file.id !== id);
    
    // 釋放已移除檔案的 URL
    const fileToRemove = files.find(file => file.id === id);
    if (fileToRemove && fileToRemove.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    
    onFilesChange(updatedFiles);
  };

  return (
    <div>
      {!viewOnly && (
        <div className="flex items-center">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept={acceptedFileTypes.join(',')}
            multiple
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <div className="flex items-center">
              <PhotoIcon className="h-5 w-5 mr-2 text-gray-500" />
              <span>{label}</span>
            </div>
          </label>
          <p className="ml-3 text-xs text-gray-500">
            {helpText}
          </p>
        </div>
      )}
      
      {/* 預覽上傳的檔案 */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {files.map(file => (
            <div key={file.id} className="relative group border rounded-md overflow-hidden">
              {file.type === 'image' ? (
                <a 
                  href={file.url || file.previewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={file.url || file.previewUrl}
                    alt={file.name}
                    className="h-32 w-full object-cover"
                    onError={(e) => {
                      // 處理圖片載入錯誤
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://via.placeholder.com/800x600?text=${encodeURIComponent(file.name)}`;
                    }}
                  />
                </a>
              ) : (
                <div className="h-32 w-full bg-gray-100 flex items-center justify-center">
                  <FilmIcon className="h-12 w-12 text-gray-400" />
                  <span className="sr-only">{file.name}</span>
                </div>
              )}
              {!viewOnly && (
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm opacity-70 hover:opacity-100"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-700" />
                </button>
              )}
              <div className="p-1 bg-white text-xs truncate">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
