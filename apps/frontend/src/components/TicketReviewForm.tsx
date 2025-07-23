import React, { useState } from 'react';
import { FileInfo } from 'shared-types';
import FileUploader from './FileUploader';

interface TicketReviewFormProps {
  onSubmit: (content: string, attachments: FileInfo[]) => void;
  onCancel: () => void;
  uploadFunction: (file: File) => Promise<FileInfo>;
}

const TicketReviewForm: React.FC<TicketReviewFormProps> = ({ onSubmit, onCancel, uploadFunction }) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<FileInfo[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(content, attachments);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative mx-auto p-5 border w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900">提交工單審核</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="review-content" className="block text-sm font-medium text-gray-700">
              回報內容
            </label>
            <textarea
              id="review-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              附件
            </label>
            <FileUploader
              onFilesChange={setAttachments}
              uploadFunction={uploadFunction}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onCancel} className="btn-secondary">
              取消
            </button>
            <button type="submit" className="btn-primary">
              提交審核
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketReviewForm;
