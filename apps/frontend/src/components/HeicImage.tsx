import React, { useState, useEffect } from 'react';
import heic2any from 'heic2any';

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

const HeicImage: React.FC<HeicImageProps> = ({ src, ...props }) => {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isHeic = src?.toLowerCase().endsWith('.heic');

    if (isHeic) {
      setLoading(true);
      fetch(src)
        .then((res) => res.blob())
        .then((blob) => heic2any({ blob, toType: 'image/jpeg', quality: 0.8 }))
        .then((conversionResult) => {
          const blob = Array.isArray(conversionResult)
            ? conversionResult[0]
            : conversionResult;
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
        })
        .catch((err) => {
          console.error('Error converting HEIC image:', err);
          setError('無法載入圖片');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setImageSrc(src);
    }
  }, [src]);

  // Clean up object URL on unmount or src change
  useEffect(() => {
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${props.className}`}
        style={{ minHeight: '100px' }}
      >
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-red-400 text-xs p-2 ${props.className}`}
      >
        {error}
      </div>
    );
  }

  return <img src={imageSrc} {...props} />;
};

export default HeicImage;
