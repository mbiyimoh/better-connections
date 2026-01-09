'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FeedbackCard, type FeedbackItem } from './FeedbackCard';
import { FeedbackDialog } from './FeedbackDialog';
import {
  FEEDBACK_AREA_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  type FeedbackArea,
  type FeedbackStatus,
  type FeedbackType,
} from '@/lib/validations/feedback';

interface FeedbackListProps {
  isAdmin?: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function FeedbackList({ isAdmin = false }: FeedbackListProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filters
  const [areaFilter, setAreaFilter] = useState<FeedbackArea | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'upvoteCount'>('createdAt');

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (areaFilter !== 'ALL') params.set('area', areaFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('sort', sortBy);
      params.set('order', 'desc');

      const response = await fetch(`/api/feedback?${params}`);
      if (!response.ok) throw new Error('Failed to fetch feedback');

      const data = await response.json();
      setFeedback(data.data);
      setPagination(data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feedback';
      setError(message);
      console.error('Error fetching feedback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [areaFilter, typeFilter, statusFilter, sortBy]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleVoteChange = (feedbackId: string, hasVoted: boolean, upvoteCount: number) => {
    setFeedback((prev) =>
      prev.map((item) =>
        item.id === feedbackId ? { ...item, hasVoted, upvoteCount } : item
      )
    );
  };

  const handleStatusChange = (feedbackId: string, status: FeedbackStatus) => {
    setFeedback((prev) =>
      prev.map((item) =>
        item.id === feedbackId ? { ...item, status } : item
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-text-primary">Feedback</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Feedback
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-text-tertiary" />

        {/* Area Filter */}
        <Select
          value={areaFilter}
          onValueChange={(v) => setAreaFilter(v as FeedbackArea | 'ALL')}
        >
          <SelectTrigger className="w-[140px] bg-bg-tertiary border-white/10 text-text-primary">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent className="bg-bg-secondary border-white/10">
            <SelectItem value="ALL" className="text-text-primary">All Areas</SelectItem>
            {(Object.entries(FEEDBACK_AREA_LABELS) as [FeedbackArea, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value} className="text-text-primary">
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as FeedbackType | 'ALL')}
        >
          <SelectTrigger className="w-[140px] bg-bg-tertiary border-white/10 text-text-primary">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-bg-secondary border-white/10">
            <SelectItem value="ALL" className="text-text-primary">All Types</SelectItem>
            {(Object.entries(FEEDBACK_TYPE_LABELS) as [FeedbackType, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value} className="text-text-primary">
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as FeedbackStatus | 'ALL')}
        >
          <SelectTrigger className="w-[140px] bg-bg-tertiary border-white/10 text-text-primary">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-bg-secondary border-white/10">
            <SelectItem value="ALL" className="text-text-primary">All Statuses</SelectItem>
            {(Object.entries(FEEDBACK_STATUS_LABELS) as [FeedbackStatus, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value} className="text-text-primary">
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as 'createdAt' | 'upvoteCount')}
        >
          <SelectTrigger className="w-[140px] bg-bg-tertiary border-white/10 text-text-primary">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-bg-secondary border-white/10">
            <SelectItem value="createdAt" className="text-text-primary">Newest</SelectItem>
            <SelectItem value="upvoteCount" className="text-text-primary">Most Voted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gold-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <Button
            onClick={fetchFeedback}
            variant="outline"
            className="border-white/10 text-text-secondary hover:text-text-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">No feedback yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <FeedbackCard
              key={item.id}
              feedback={item}
              isAdmin={isAdmin}
              onVoteChange={handleVoteChange}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Pagination info */}
      {pagination && pagination.total > 0 && (
        <p className="text-sm text-text-tertiary text-center">
          Showing {feedback.length} of {pagination.total} items
        </p>
      )}

      {/* Dialog */}
      <FeedbackDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={fetchFeedback}
      />
    </div>
  );
}
