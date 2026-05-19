'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { uploadMedia, deleteMedia } from '@/lib/supabase/storage';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, X, FileVideo, FileAudio, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { MediaDisplay } from '@/components/ui/media-display';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(0); // Fallback to 0 on error
    };
    video.src = URL.createObjectURL(file);
  });
};

interface MediaUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  acceptedTypes?: string;
  bucket?: string;
}

export function MediaUploader({
  value = [],
  onChange,
  maxFiles = 5,
  acceptedTypes = 'image/*,video/*,audio/*',
  bucket = 'media'
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<any>(null);

  const loadFfmpeg = async () => {
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }
    const ffmpeg = ffmpegRef.current;
    if (ffmpeg.loaded) return;
    
    ffmpeg.on('progress', ({ progress }: { progress: number }) => {
      const percent = Math.min(Math.round(progress * 100), 100);
      setCompressionProgress(percent);
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  };

  const compressVideo = async (file: File): Promise<File> => {
    await loadFfmpeg();
    const ffmpeg = ffmpegRef.current;
    
    const inputName = `input_${Date.now()}_${file.name}`;
    const outputName = `output_${Date.now()}.mp4`;
    
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    
    await ffmpeg.exec([
      '-i', inputName,
      '-vcodec', 'libx264',
      '-crf', '28',
      '-preset', 'ultrafast',
      '-vf', "scale='min(854,iw)':-2", // Downscale to 480p width
      outputName
    ]);
    
    const data = await ffmpeg.readFile(outputName);
    
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    
    return new File([data], file.name.replace(/\.[^/.]+$/, "") + ".mp4", { type: 'video/mp4' });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);

    if (value.length + files.length > maxFiles) {
      toast.error(`You can only upload up to ${maxFiles} files`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of files) {
        // Enforce initial raw size limit (250MB)
        if (file.size > 250 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 250MB raw)`);
          continue;
        }

        let fileToUpload = file;
        
        if (file.type.startsWith('video/')) {
          const duration = await getVideoDuration(file);
          // Calculate bitrate in bps. If duration is 0 (error), assume high bitrate.
          const bitrate = duration > 0 ? (file.size * 8) / duration : 9999999;
          
          // If bitrate is > 2.5 Mbps, it's likely a high-quality/raw video, so compress it.
          // Otherwise, it's already highly compressed, bypass to save time and preserve quality.
          if (bitrate > 2500000) {
            setCompressionProgress(0);
            try {
              fileToUpload = await compressVideo(file);
            } catch (e) {
              console.error('Video compression failed, falling back to original', e);
              toast.error('Video compression failed, uploading original file');
            } finally {
              setCompressionProgress(null);
            }
          }
        }

        // Enforce final storage limit (70MB) just in case
        if (fileToUpload.size > 70 * 1024 * 1024) {
          toast.error(`${fileToUpload.name} is too large after processing (limit 70MB)`);
          continue;
        }

        const url = await uploadMedia(fileToUpload, bucket);
        newUrls.push(url);
      }

      onChange([...value, ...newUrls]);
      if (newUrls.length > 0) {
        toast.success(`Successfully uploaded ${newUrls.length} file(s)`);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (urlToRemove: string) => {
    try {
      // Optimistic UI update
      onChange(value.filter(url => url !== urlToRemove));
      // Delete from storage
      await deleteMedia(urlToRemove, bucket);
    } catch (error) {
      console.error('Failed to remove media', error);
    }
  };

  const renderPreview = (url: string) => {
    return (
      <div className="relative w-full h-24 bg-black/5 rounded-md flex items-center justify-center overflow-hidden group">
        <MediaDisplay
          url={url}
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          autoPlayHover={true}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {value.map((url, index) => (
          <div key={`${url}-${index}`} className="relative group">
            {renderPreview(url)}
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {value.length < maxFiles && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-md hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                {compressionProgress !== null ? (
                  <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
                    Compressing<br/>{compressionProgress}%
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-medium">Uploading...</span>
                )}
              </div>
            ) : (
              <>
                <UploadCloud className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground font-medium">Upload Media</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
