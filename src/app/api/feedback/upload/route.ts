import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { uploadFeedbackAttachment, isUploadError } from '@/lib/storage/supabase-storage';

/**
 * POST /api/feedback/upload - Upload file attachment
 *
 * Accepts multipart form data with a single file.
 * Creates a temporary attachment record that will be linked
 * to feedback when the feedback is created.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const result = await uploadFeedbackAttachment(file, user.id);

    if (isUploadError(result)) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }

    // Create attachment record (without feedbackId - will be linked when feedback is created)
    const attachment = await prisma.feedbackAttachment.create({
      data: {
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        url: result.url,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      url: attachment.url,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
