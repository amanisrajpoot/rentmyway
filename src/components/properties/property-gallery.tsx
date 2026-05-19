'use client';

import { useState } from 'react';
import { MediaDisplay } from '@/components/ui/media-display';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return null; // The parent handles the empty state
  }

  return (
    <div className="space-y-4 p-4 bg-muted/30">
      <div className="h-96 w-full rounded-lg overflow-hidden relative border bg-black/5">
        <MediaDisplay
          url={images[selectedIndex]}
          alt={title}
          className="w-full h-full object-contain bg-black"
          controls={true}
        />
      </div>
      
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((url, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedIndex(idx)}
              className={`h-20 w-32 shrink-0 rounded-md overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity ${
                idx === selectedIndex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'bg-black/5 opacity-60'
              }`}
            >
              <MediaDisplay 
                url={url} 
                alt={`${title} view ${idx + 1}`} 
                className="w-full h-full object-cover" 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
