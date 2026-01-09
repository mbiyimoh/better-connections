'use client';

import { useState, useRef } from 'react';
import { Upload, X, File, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FILE_UPLOAD_LIMITS } from '@/lib/design-system';

interface UploadedFile {
  id: string;
  fileName: string;
  url: string;
}

interface FileUploadInputProps {
  uploadedFiles: UploadedFile[];
  onFileUploaded: (file: UploadedFile) => void;
  onFileRemoved: (fileId: string) => void;
  maxFiles?: number;
}

export function FileUploadInput({
  uploadedFiles,
  onFileUploaded,
  onFileRemoved,
  maxFiles = FILE_UPLOAD_LIMITS.MAX_FILES_PER_FEEDBACK,
}: FileUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxFiles - uploadedFiles.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToUpload) {
      // Validate type
      if (!FILE_UPLOAD_LIMITS.ALLOWED_TYPES.includes(file.type as typeof FILE_UPLOAD_LIMITS.ALLOWED_TYPES[number])) {
        toast.error(`${file.name}: Invalid file type. Allowed: images and PDFs`);
        continue;
      }

      // Validate size
      if (file.size > FILE_UPLOAD_LIMITS.MAX_SIZE) {
        toast.error(`${file.name}: File too large. Maximum ${FILE_UPLOAD_LIMITS.MAX_SIZE_MB}MB`);
        continue;
      }

      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/feedback/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      onFileUploaded({
        id: data.id,
        fileName: data.fileName,
        url: data.url,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-4 h-4 text-text-secondary" />;
    }
    return <File className="w-4 h-4 text-text-secondary" />;
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-gold-primary bg-gold-subtle'
            : 'border-white/20 hover:border-white/40 bg-bg-tertiary/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_UPLOAD_LIMITS.ALLOWED_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-gold-primary animate-spin" />
            <p className="text-sm text-text-secondary">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-text-tertiary" />
            <p className="text-sm text-text-secondary">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-text-tertiary">
              Images and PDFs up to 10MB ({uploadedFiles.length}/{maxFiles})
            </p>
          </div>
        )}
      </div>

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadedFiles.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-bg-tertiary"
            >
              {getFileIcon(file.fileName)}
              <span className="flex-1 text-sm text-text-primary truncate">
                {file.fileName}
              </span>
              <button
                type="button"
                onClick={() => onFileRemoved(file.id)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                aria-label={`Remove ${file.fileName}`}
              >
                <X className="w-4 h-4 text-text-tertiary hover:text-red-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
