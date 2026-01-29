'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Send,
  Archive,
  Trash2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompletionStats {
  total: number;
  completed: number;
  inProgress: number;
}

interface QuestionSetCardProps {
  id: string;
  internalId: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  questionCount: number;
  completionStats: CompletionStats;
  onEdit: () => void;
  onPublish: () => void;
  onNotify: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-zinc-500/20 text-zinc-400',
  },
  PUBLISHED: {
    label: 'Published',
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-zinc-800/50 text-zinc-500',
  },
};

export function QuestionSetCard({
  internalId,
  title,
  description,
  status,
  publishedAt,
  questionCount,
  completionStats,
  onEdit,
  onPublish,
  onNotify,
  onDelete,
  isDragging,
  dragHandleProps,
}: QuestionSetCardProps) {
  const config = statusConfig[status];
  const completionPercent =
    completionStats.total > 0
      ? Math.round((completionStats.completed / completionStats.total) * 100)
      : 0;

  return (
    <Card
      className={cn(
        'p-4 transition-all',
        isDragging && 'opacity-50 ring-2 ring-gold-primary',
        status === 'ARCHIVED' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        {status !== 'ARCHIVED' && (
          <div
            {...dragHandleProps}
            className="mt-1 cursor-grab text-text-tertiary hover:text-text-secondary"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-tertiary font-mono">
              {internalId}
            </span>
            <Badge className={cn('text-xs border-0', config.className)}>
              {config.label}
            </Badge>
          </div>

          <h3 className="font-medium text-text-primary truncate">{title}</h3>

          {description && (
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">
              {description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm text-text-secondary">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              <span>{questionCount} questions</span>
            </div>

            {status === 'PUBLISHED' && (
              <div className="flex items-center gap-1.5">
                <span>
                  {completionStats.completed}/{completionStats.total} completed
                </span>
                <span className="text-text-tertiary">({completionPercent}%)</span>
              </div>
            )}
          </div>

          {status === 'PUBLISHED' && publishedAt && (
            <p className="text-xs text-text-tertiary mt-2">
              Published {new Date(publishedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status !== 'ARCHIVED' && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}

            {status === 'DRAFT' && (
              <DropdownMenuItem onClick={onPublish}>
                <Send className="h-4 w-4 mr-2" />
                Publish
              </DropdownMenuItem>
            )}

            {status === 'PUBLISHED' && (
              <DropdownMenuItem onClick={onNotify}>
                <Send className="h-4 w-4 mr-2" />
                Send Notifications
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-400 focus:text-red-400"
            >
              {status === 'PUBLISHED' ? (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
