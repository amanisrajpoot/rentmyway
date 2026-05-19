'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { uploadMedia, deleteMedia } from '@/lib/supabase/storage';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, X, FileVideo, FileAudio, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { MediaDisplay } from '@/components/ui/media-display';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Enforce basic size limit (e.g., 50MB for media)
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 50MB)`);
          continue;
        }

        const url = await uploadMedia(file, bucket);
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
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
