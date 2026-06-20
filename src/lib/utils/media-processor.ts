import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function processMediaUrls(urls: string[], bucketName: string, folderPath: string): Promise<string[]> {
  const supabase = await createClient();
  const processedUrls: string[] = [];

  for (const url of urls) {
    if (!url || typeof url !== 'string') continue;
    
    // If it's already a supabase storage URL, keep it
    if (url.includes('supabase.co/storage/v1/object/public')) {
      processedUrls.push(url.trim());
      continue;
    }

    try {
      // 1. Fetch the image from external URL
      const response = await fetch(url.trim(), {
        headers: {
          'Accept': 'image/*,video/*'
        }
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch media from URL: ${url}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 2. Generate a unique filename
      const extension = contentType.split('/')[1] || 'bin';
      const uniqueId = crypto.randomUUID();
      const fileName = `${folderPath}/${uniqueId}.${extension}`;

      // 3. Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: contentType,
          upsert: true,
        });

      if (error) {
        console.error(`Supabase upload error for ${url}:`, error);
        continue;
      }

      // 4. Get public URL
      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      if (publicData?.publicUrl) {
        processedUrls.push(publicData.publicUrl);
      }

    } catch (err) {
      console.error(`Error processing URL ${url}:`, err);
    }
  }

  return processedUrls;
}
