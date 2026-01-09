import { createServerSupabaseClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { FILE_UPLOAD_LIMITS } from '@/lib/design-system';

const FEEDBACK_BUCKET = 'feedback-attachments';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadError {
  error: string;
  code: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'UPLOAD_FAILED';
}

/**
 * Upload a file to Supabase Storage for feedback attachments.
 */
export async function uploadFeedbackAttachment(
  file: File,
  userId: string
): Promise<UploadResult | UploadError> {
  // Validate file type
  if (!FILE_UPLOAD_LIMITS.ALLOWED_TYPES.includes(file.type as typeof FILE_UPLOAD_LIMITS.ALLOWED_TYPES[number])) {
    return {
      error: `Invalid file type. Allowed types: ${FILE_UPLOAD_LIMITS.ALLOWED_TYPES.join(', ')}`,
      code: 'INVALID_TYPE',
    };
  }

  // Validate file size
  if (file.size > FILE_UPLOAD_LIMITS.MAX_SIZE) {
    return {
      error: `File too large. Maximum size: ${FILE_UPLOAD_LIMITS.MAX_SIZE_MB}MB`,
      code: 'FILE_TOO_LARGE',
    };
  }

  const supabase = await createServerSupabaseClient();

  // Generate unique file path: userId/uuid-originalname
  const fileExtension = file.name.split('.').pop() || '';
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `${userId}/${uniqueFileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(FEEDBACK_BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    return {
      error: 'Failed to upload file',
      code: 'UPLOAD_FAILED',
    };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(FEEDBACK_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFeedbackAttachment(url: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  // Extract path from URL
  const urlObj = new URL(url);
  const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);

  const filePath = pathMatch?.[2];
  if (!pathMatch || pathMatch[1] !== FEEDBACK_BUCKET || !filePath) {
    console.error('Invalid attachment URL:', url);
    return false;
  }

  const { error } = await supabase.storage
    .from(FEEDBACK_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Supabase storage delete error:', error);
    return false;
  }

  return true;
}

/**
 * Check if an upload result is an error.
 */
export function isUploadError(result: UploadResult | UploadError): result is UploadError {
  return 'error' in result;
}
