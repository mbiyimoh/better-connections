'use client';

import { formatDistanceToNow } from 'date-fns';
import { Paperclip } from 'lucide-react';
import { UpvoteButton } from './UpvoteButton';
import { StatusBadge } from './StatusBadge';
import { StatusSelector } from './StatusSelector';
import {
  FEEDBACK_AREA_LABELS,
  FEEDBACK_TYPE_LABELS,
  type FeedbackArea,
  type FeedbackType,
  type FeedbackStatus,
} from '@/lib/validations/feedback';
import { FEEDBACK_TYPE_COLORS } from '@/lib/design-system';

export interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  area: FeedbackArea;
  type: FeedbackType;
  status: FeedbackStatus;
  upvoteCount: number;
  hasVoted: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
  attachments: {
    id: string;
    fileName: string;
    url: string;
    mimeType: string;
  }[];
}

interface FeedbackCardProps {
  feedback: FeedbackItem;
  isAdmin?: boolean;
  onVoteChange: (feedbackId: string, hasVoted: boolean, upvoteCount: number) => void;
  onStatusChange: (feedbackId: string, status: FeedbackStatus) => void;
}

export function FeedbackCard({
  feedback,
  isAdmin = false,
  onVoteChange,
  onStatusChange,
}: FeedbackCardProps) {
  return (
    <div className="bg-bg-secondary border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
      <div className="flex gap-4">
        {/* Upvote */}
        <div className="flex-shrink-0">
          <UpvoteButton
            feedbackId={feedback.id}
            upvoteCount={feedback.upvoteCount}
            hasVoted={feedback.hasVoted}
            onVoteChange={onVoteChange}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Type badge */}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${FEEDBACK_TYPE_COLORS[feedback.type]}`}>
              {FEEDBACK_TYPE_LABELS[feedback.type]}
            </span>

            {/* Area badge */}
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-bg-tertiary text-text-secondary">
              {FEEDBACK_AREA_LABELS[feedback.area]}
            </span>

            {/* Status */}
            {isAdmin ? (
              <StatusSelector
                feedbackId={feedback.id}
                currentStatus={feedback.status}
                onStatusChange={onStatusChange}
              />
            ) : (
              <StatusBadge status={feedback.status} />
            )}

            {/* Attachments indicator */}
            {feedback.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <Paperclip className="w-3 h-3" />
                {feedback.attachments.length}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-text-primary font-medium mb-1 truncate">
            {feedback.title}
          </h3>

          {/* Description preview */}
          <p className="text-text-secondary text-sm line-clamp-2 mb-2">
            {feedback.description}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{feedback.user.name}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
