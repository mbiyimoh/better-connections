'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUploadInput } from './FileUploadInput';
import {
  FEEDBACK_AREA_LABELS,
  FEEDBACK_TYPE_LABELS,
  FeedbackAreaEnum,
  FeedbackTypeEnum,
  type FeedbackArea,
  type FeedbackType,
} from '@/lib/validations/feedback';

// Form validation schema (matches API validation)
const feedbackFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be 5000 characters or less'),
  area: FeedbackAreaEnum,
  type: FeedbackTypeEnum,
});

type FormData = z.infer<typeof feedbackFormSchema>;

interface FeedbackFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface UploadedFile {
  id: string;
  fileName: string;
  url: string;
}

export function FeedbackForm({ onSuccess, onCancel }: FeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      title: '',
      description: '',
      area: 'OTHER',
      type: 'IDEA',
    },
  });

  const selectedArea = watch('area');
  const selectedType = watch('type');

  const handleFileUploaded = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);
  };

  const handleFileRemoved = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          attachmentIds: uploadedFiles.map((f) => f.id),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit feedback');
      }

      toast.success('Feedback submitted successfully!');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-text-primary">
          Title <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Brief summary of your feedback"
          className="bg-bg-tertiary border-white/10 text-text-primary placeholder:text-text-tertiary"
        />
        {errors.title && (
          <p className="text-sm text-red-400">{errors.title.message}</p>
        )}
      </div>

      {/* Area & Type Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Area */}
        <div className="space-y-2">
          <Label className="text-text-primary">Area</Label>
          <Select
            value={selectedArea}
            onValueChange={(value) => setValue('area', value as FeedbackArea)}
          >
            <SelectTrigger className="bg-bg-tertiary border-white/10 text-text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-bg-secondary border-white/10">
              {(Object.entries(FEEDBACK_AREA_LABELS) as [FeedbackArea, string][]).map(
                ([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className="text-text-primary hover:bg-bg-tertiary"
                  >
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label className="text-text-primary">Type</Label>
          <Select
            value={selectedType}
            onValueChange={(value) => setValue('type', value as FeedbackType)}
          >
            <SelectTrigger className="bg-bg-tertiary border-white/10 text-text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-bg-secondary border-white/10">
              {(Object.entries(FEEDBACK_TYPE_LABELS) as [FeedbackType, string][]).map(
                ([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className="text-text-primary hover:bg-bg-tertiary"
                  >
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-text-primary">
          Description <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Describe your feedback in detail..."
          rows={5}
          className="bg-bg-tertiary border-white/10 text-text-primary placeholder:text-text-tertiary resize-none"
        />
        {errors.description && (
          <p className="text-sm text-red-400">{errors.description.message}</p>
        )}
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label className="text-text-primary">Attachments (optional)</Label>
        <FileUploadInput
          uploadedFiles={uploadedFiles}
          onFileUploaded={handleFileUploaded}
          onFileRemoved={handleFileRemoved}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="border-white/10 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </Button>
      </div>
    </form>
  );
}
