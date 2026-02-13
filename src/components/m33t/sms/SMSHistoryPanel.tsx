'use client';

import { useState, useEffect } from 'react';
import { X, MessageSquare, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SMSStatusBadge, type SMSStatus } from './SMSStatusBadge';
import { getErrorInfo } from '@/lib/notifications/sms-error-codes';
import { formatDistanceToNow } from 'date-fns';

interface SMSMessage {
  id: string;
  messageSid: string;
  toPhone: string;
  body: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  notificationType: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  statusUpdatedAt: string;
}

interface SMSHistoryData {
  attendee: {
    id: string;
    name: string;
    phone: string | null;
  };
  messages: SMSMessage[];
  summary: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
  };
}

interface SMSHistoryPanelProps {
  eventId: string;
  attendeeId: string;
  attendeeName: string;
  onClose: () => void;
  onRetry?: (messageId: string) => void;
}

// Map notification types to readable labels
const notificationTypeLabels: Record<string, string> = {
  invitation: 'Invitation',
  rsvp_reminder: 'RSVP Reminder',
  match_reveal: 'Match Reveal',
  event_reminder: 'Event Reminder',
  new_rsvps: 'New RSVPs',
  question_set: 'Question Set',
  phone_verification: 'Phone Verification',
  unknown: 'Notification',
};

function formatNotificationType(type: string): string {
  return notificationTypeLabels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SMSHistoryPanel({
  eventId,
  attendeeId,
  attendeeName,
  onClose,
  onRetry,
}: SMSHistoryPanelProps) {
  const [data, setData] = useState<SMSHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/attendees/${attendeeId}/sms-history`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw new Error('Please log in to view SMS history');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view this SMS history');
        } else if (response.status === 404) {
          throw new Error('Attendee not found');
        } else {
          throw new Error(errorData.error || `Server error (${response.status})`);
        }
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load SMS history';
      setError(errorMessage);
      console.error('SMS history fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [eventId, attendeeId]);

  const toggleExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleRetry = async (messageId: string) => {
    if (!onRetry) return;
    setRetryingId(messageId);
    try {
      await onRetry(messageId);
      // Refresh the history after retry
      await fetchHistory();
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <MessageSquare className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold text-white">SMS History</h2>
              <p className="text-sm text-zinc-400">{attendeeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchHistory}
              disabled={loading}
              className="h-8 w-8 text-zinc-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary */}
        {data && (
          <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-zinc-400">
                {data.summary.total} message{data.summary.total !== 1 ? 's' : ''}
              </span>
              {data.summary.delivered > 0 && (
                <span className="text-emerald-400">
                  {data.summary.delivered} delivered
                </span>
              )}
              {data.summary.failed > 0 && (
                <span className="text-red-400">
                  {data.summary.failed} failed
                </span>
              )}
              {data.summary.pending > 0 && (
                <span className="text-blue-400">
                  {data.summary.pending} pending
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 text-zinc-500 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && data?.messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-zinc-400">No SMS messages sent yet</p>
            </div>
          )}

          {!loading &&
            !error &&
            data?.messages.map((message) => {
              const isExpanded = expandedMessages.has(message.id);
              const isFailed = message.status === 'failed' || message.status === 'undelivered';
              const errorInfo = isFailed ? getErrorInfo(message.errorCode) : null;

              return (
                <div
                  key={message.id}
                  className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
                >
                  {/* Message header */}
                  <button
                    onClick={() => toggleExpanded(message.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {formatNotificationType(message.notificationType)}
                          </span>
                          <SMSStatusBadge status={message.status as SMSStatus} size="sm" />
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-zinc-700">
                      {/* Message body */}
                      {message.body && (
                        <div className="mb-3">
                          <p className="text-xs text-zinc-500 mb-1">Message</p>
                          <p className="text-sm text-zinc-300 bg-zinc-700/50 rounded p-2">
                            {message.body}
                          </p>
                        </div>
                      )}

                      {/* Error details */}
                      {isFailed && errorInfo && (
                        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-red-400 font-medium">
                                {errorInfo.title} ({errorInfo.code})
                              </p>
                              <p className="text-xs text-red-300/80 mt-0.5">
                                {errorInfo.description}
                              </p>
                              <p className="text-xs text-zinc-400 mt-1">
                                {errorInfo.action}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="space-y-1 text-xs text-zinc-500">
                        <p>
                          Created:{' '}
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                        {message.sentAt && (
                          <p>
                            Sent:{' '}
                            {new Date(message.sentAt).toLocaleString()}
                          </p>
                        )}
                        {message.deliveredAt && (
                          <p>
                            Delivered:{' '}
                            {new Date(message.deliveredAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Retry button for failed messages */}
                      {isFailed && onRetry && !errorInfo?.isPermanent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(message.id)}
                          disabled={retryingId === message.id}
                          className="mt-3 w-full"
                        >
                          {retryingId === message.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                              Retrying...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-2" />
                              Retry
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
