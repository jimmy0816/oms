import React, { useState, useRef, CSSProperties } from 'react';

interface TooltipCellProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TooltipCell: React.FC<TooltipCellProps> = ({
  content,
  children,
  className,
}) => {
  const [showMagnified, setShowMagnified] = useState(false);
  const [magnifiedStyle, setMagnifiedStyle] = useState<CSSProperties>({});
  const cellRef = useRef<HTMLDivElement>(null);
  const magnifiedContentRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();

      setMagnifiedStyle({
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        visibility: 'hidden',
        zIndex: 100,
        backgroundColor: 'white',
        padding: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderRadius: '0.25rem',
        textAlign: 'left',
        overflowY: 'auto',
        overflowX: 'hidden',
        whiteSpace: 'normal',
        maxWidth: '400px',
        maxHeight: `${window.innerHeight * 0.7}px`,
        transition: 'none',
        opacity: 0,
        transform: 'scale(1)',
        transformOrigin: 'center center',
      });
      setShowMagnified(true);

      setTimeout(() => {
        if (magnifiedContentRef.current) {
          const measuredRect =
            magnifiedContentRef.current.getBoundingClientRect();

          const finalWidth = measuredRect.width;
          const finalHeight = measuredRect.height;

          const newLeft = rect.left + rect.width / 2 - finalWidth / 2;
          const newTop = rect.top + rect.height / 2 - finalHeight / 2;

          setMagnifiedStyle((prev) => ({
            ...prev,
            top: `${newTop}px`,
            left: `${newLeft}px`,
            width: `${finalWidth}px`,
            height: `${finalHeight}px`,
            visibility: 'visible',
            opacity: 1,
            transition: 'all .15s ease-out',
            transform: 'scale(1)',
          }));
        }
      }, 10);
    }
  };

  const handleMouseLeave = () => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setMagnifiedStyle((prev) => ({
        ...prev,
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        padding: '0.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        opacity: 0,
        transform: 'scale(0.8)',
        overflowY: 'hidden',
        overflowX: 'hidden',
        whiteSpace: 'nowrap',
      }));
      setTimeout(() => setShowMagnified(false), 500);
    }
  };

  return (
    <div
      ref={cellRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {showMagnified && (
        <div
          ref={magnifiedContentRef}
          style={magnifiedStyle}
          className="text-base font-medium text-gray-900"
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default TooltipCell;
