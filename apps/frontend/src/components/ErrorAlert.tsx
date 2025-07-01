import React, { useState, useEffect } from 'react';

interface ErrorAlertProps {
  message: string;
  onClose?: () => void;
  autoHideDuration?: number; // 自動隱藏的時間（毫秒）
}

/**
 * 錯誤提示組件
 * 用於顯示錯誤訊息，可自動隱藏
 */
const ErrorAlert: React.FC<ErrorAlertProps> = ({ 
  message, 
  onClose, 
  autoHideDuration = 5000 // 預設 5 秒後自動隱藏
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // 處理關閉
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  // 自動隱藏
  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [autoHideDuration]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              {message}
            </p>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={handleClose}
                className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
              >
                <span className="sr-only">關閉</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;
