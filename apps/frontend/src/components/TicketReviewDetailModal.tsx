import React from 'react';
import { TicketReview } from 'shared-types';
import HeicImage from './HeicImage';

interface TicketReviewDetailModalProps {
  review: TicketReview;
  onClose: () => void;
}

const TicketReviewDetailModal: React.FC<TicketReviewDetailModalProps> = ({
  review,
  onClose,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative mx-auto p-6 border w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-gray-900">審核記錄詳情</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">提交者</h4>
            <p className="mt-1 text-gray-900">{review.creator.name}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">提交時間</h4>
            <p className="mt-1 text-gray-900">{formatDate(review.createdAt)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">審核內容</h4>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">
              {review.content}
            </p>
          </div>
          {review.attachments && review.attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">附件</h4>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {review.attachments.map((file) => (
                  <div key={file.id} className="w-full">
                    {file.fileType.startsWith('image') ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <HeicImage
                          src={file.url}
                          alt={file.filename}
                          className="rounded shadow border w-full h-32 object-cover cursor-pointer transition-transform hover:scale-105"
                        />
                      </a>
                    ) : (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {file.filename}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketReviewDetailModal;
