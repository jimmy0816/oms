import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Attachments } from 'shared-types';
import heic2any from 'heic2any';

// Define FileInfo interface
interface FileInfo {
  id: string;
  filename: string;
  url: string;
  fileType: string;
  fileSize?: number;
}

interface PreviewFile extends FileInfo {
  objectURL: string; // Temporary URL for preview
}

interface FileUploaderProps {
  onFilesChange: (files: FileInfo[]) => void;
  uploadFunction: (file: File) => Promise<FileInfo>;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  initialFiles?: Attachments[]; // Add initialFiles prop
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesChange,
  uploadFunction,
  onUploadStart,
  onUploadEnd,
  initialFiles = [], // Default to empty array
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<PreviewFile[]>([]);
  const initialFilesRef = useRef<Attachments[]>([]);
  const [isDragging, setIsDragging] = useState(false); // For drag & drop UI

  // Initialize uploadedFiles with initialFiles
  useEffect(() => {
    if (
      JSON.stringify(initialFiles) !== JSON.stringify(initialFilesRef.current)
    ) {
      const initialPreviewFiles: PreviewFile[] = initialFiles.map((file) => ({
        id: file.id,
        filename: file.filename,
        url: file.url,
        fileType: file.fileType,
        fileSize: file.fileSize,
        objectURL: file.url,
      }));
      setUploadedFiles(initialPreviewFiles);
      initialFilesRef.current = initialFiles;
    }
  }, [initialFiles]);

  useEffect(() => {
    onFilesChange(uploadedFiles);
  }, [uploadedFiles, onFilesChange]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setUploadedFiles((prevFiles) => {
      const fileToRemove = prevFiles.find((file) => file.id === fileId);
      if (fileToRemove && fileToRemove.objectURL.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.objectURL);
      }
      const updatedFiles = prevFiles.filter((file) => file.id !== fileId);
      return updatedFiles;
    });
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setError(null); // Clear previous errors

      const validFiles: File[] = [];
      let hasInvalidFiles = false;
      for (const file of files) {
        const fileType = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
          ? 'video'
          : undefined;

        // Check for HEIC files
        const isHeic =
          file.name.toLowerCase().endsWith('.heic') ||
          file.type === 'image/heic' ||
          file.type === 'image/heif';

        if (!fileType && !isHeic) {
          hasInvalidFiles = true;
        } else {
          validFiles.push(file);
        }
      }

      if (hasInvalidFiles) {
        setError('一個或多個檔案類型不受支援。');
      }

      if (validFiles.length === 0) {
        return;
      }

      setUploading(true);
      onUploadStart?.();

      try {
        const uploadPromises = validFiles.map(async (file) => {
          let fileToUpload = file;
          let objectURL: string;

          // Convert HEIC to JPEG
          if (
            file.name.toLowerCase().endsWith('.heic') ||
            file.type === 'image/heic' ||
            file.type === 'image/heif'
          ) {
            try {
              const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.8,
              });

              const convertedFile = new File(
                [
                  Array.isArray(convertedBlob)
                    ? convertedBlob[0]
                    : convertedBlob,
                ],
                file.name.replace(/\.heic$/i, '.jpg'),
                { type: 'image/jpeg' }
              );

              fileToUpload = convertedFile;
            } catch (conversionError) {
              console.error('HEIC conversion failed:', conversionError);
              throw new Error(`無法轉換檔案 ${file.name}`);
            }
          }

          objectURL = URL.createObjectURL(fileToUpload);

          try {
            const newFile = await uploadFunction(fileToUpload);
            return {
              ...newFile,
              objectURL,
              fileType: fileToUpload.type,
            };
          } catch (uploadError) {
            URL.revokeObjectURL(objectURL);
            throw uploadError;
          }
        });

        const newFiles = await Promise.all(uploadPromises);
        setUploadedFiles((prevFiles) => [...prevFiles, ...newFiles]);
      } catch (err: any) {
        console.error(err);
        setError(err.message || '上傳時發生錯誤');
      } finally {
        setUploading(false);
        onUploadEnd?.();
      }
    },
    [uploadFunction, onUploadStart, onUploadEnd]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        handleFiles(Array.from(event.target.files));
      }
    },
    [handleFiles]
  );

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (event.dataTransfer.files) {
        handleFiles(Array.from(event.dataTransfer.files));
      }
    },
    [handleFiles]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles = Array.from(items)
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => {
          const file = item.getAsFile();
          if (file) {
            return new File(
              [file],
              `pasted-${Date.now()}.${file.type.split('/')[1]}`,
              { type: file.type }
            );
          }
          return null;
        })
        .filter((file): file is File => file !== null);

      if (imageFiles.length > 0) {
        handleFiles(imageFiles);
      }
    },
    [handleFiles]
  );

  useEffect(() => {
    return () => {
      uploadedFiles.forEach((file) => {
        if (file.objectURL.startsWith('blob:')) {
          URL.revokeObjectURL(file.objectURL);
        }
      });
    };
  }, [uploadedFiles]);

  return (
    <div
      className="flex flex-col items-center justify-center w-full"
      onPaste={handlePaste}
      tabIndex={0}
    >
      <label
        htmlFor="dropzone-file"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:bg-gray-100'
        }`}
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
            <span className="font-semibold">點擊上傳</span>
            、拖曳或貼上檔案
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
          multiple // Allow multiple files
        />
      </label>
      {uploading && <p className="mt-2 text-sm text-blue-600">上傳中...</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {uploadedFiles.map((file) => (
          <div
            key={file.id}
            className="relative w-full h-32 border rounded-lg overflow-hidden group"
          >
            {file.fileType.startsWith('image') ? (
              <img
                src={file.objectURL}
                alt={file.filename}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={file.objectURL}
                controls
                className="w-full h-full object-cover"
              />
            )}
            <button
              onClick={() => handleRemoveFile(file.id)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-100"
              aria-label="移除檔案"
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUploader;
