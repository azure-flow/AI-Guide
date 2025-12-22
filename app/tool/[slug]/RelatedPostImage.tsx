'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

interface RelatedPostImageProps {
  src: string;
  alt: string;
  postNumber: number;
}

export default function RelatedPostImage({ src, alt, postNumber }: RelatedPostImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get container dimensions (what the code allocates)
    // Get image dimensions (what you uploaded)
    const img = new window.Image();
    img.onload = () => {
      // Image loaded - dimensions available if needed
    };
    img.src = src;
  }, [src, postNumber]);

  return (
    <div ref={containerRef} className="border border-gray-200 rounded overflow-hidden shadow-sm h-full w-full">
      <div className="w-full h-full relative">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="50vw"
        />
      </div>
    </div>
  );
}