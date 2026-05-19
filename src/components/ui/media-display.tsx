import React from 'react';
import { FileVideo, FileAudio } from 'lucide-react';

export const isVideoUrl = (url: string) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg|mov|avi|wmv|mkv)$/i) || url.match(/\/video\//i) || url.includes('video');
};

export const isAudioUrl = (url: string) => {
  if (!url) return false;
  return url.match(/\.(mp3|wav|ogg|m4a)$/i) || url.match(/\/audio\//i) || url.includes('audio');
};

interface MediaDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  url: string;
  alt?: string;
  className?: string;
  muted?: boolean;
  controls?: boolean;
  autoPlayHover?: boolean;
}

export function MediaDisplay({ 
  url, 
  alt = 'Media', 
  className = '', 
  muted = true, 
  controls = false,
  autoPlayHover = false,
  ...props
}: MediaDisplayProps) {
  if (!url) return null;

  if (isVideoUrl(url)) {
    if (autoPlayHover) {
      return (
        <video
          src={url}
          className={className}
          muted={muted}
          controls={controls}
          playsInline
          loop
          onMouseEnter={(e) => e.currentTarget.play()}
          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
        />
      );
    }
    
    return (
      <video
        src={url}
        className={className}
        muted={muted}
        controls={controls}
        playsInline
      />
    );
  }

  if (isAudioUrl(url)) {
    return (
      <div className={`flex flex-col items-center justify-center bg-black/5 ${className}`} {...props}>
        <FileAudio className="h-8 w-8 text-muted-foreground mb-2" />
        {controls && <audio src={url} controls className="w-full max-w-[200px]" />}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={className} />
  );
}
