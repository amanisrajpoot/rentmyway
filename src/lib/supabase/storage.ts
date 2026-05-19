import { createClient } from './client';

export async function uploadMedia(file: File, bucket: string = 'media'): Promise<string> {
  const supabase = createClient();
  
  // Create a unique file name to avoid collisions
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) {
    throw new Error(`Failed to upload media: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function deleteMedia(url: string, bucket: string = 'media'): Promise<void> {
  if (!url) return;
  const supabase = createClient();
  
  // Extract filename from the URL
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];

  const { error } = await supabase.storage
    .from(bucket)
    .remove([fileName]);

  if (error) {
    console.error(`Failed to delete media: ${error.message}`);
  }
}
