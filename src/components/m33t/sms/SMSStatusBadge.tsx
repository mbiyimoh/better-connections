'use client';

import { cn } from '@/lib/utils';
import { Check, Clock, AlertCircle, Send, XCircle } from 'lucide-react';

export type SMSStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'undelivered';

interface SMSStatusBadgeProps {
  status: SMSStatus | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  showLabel?: boolean;
}

const statusConfig: Record<
  SMSStatus,
  {
    label: string;
    icon: typeof Check;
    className: string;
    iconClassName: string;
  }
> = {
  queued: {
    label: 'Queued',
    icon: Clock,
    className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    iconClassName: 'text-zinc-400',
  },
  sending: {
    label: 'Sending',
    icon: Send,
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    iconClassName: 'text-blue-400',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    iconClassName: 'text-blue-400',
  },
  delivered: {
    label: 'Delivered',
    icon: Check,
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    iconClassName: 'text-emerald-400',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    iconClassName: 'text-red-400',
  },
  undelivered: {
    label: 'Undelivered',
    icon: AlertCircle,
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    iconClassName: 'text-amber-400',
  },
};

export function SMSStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  showLabel = true,
}: SMSStatusBadgeProps) {
  // Normalize status to lowercase and handle unknown statuses
  const normalizedStatus = status.toLowerCase() as SMSStatus;
  const config = statusConfig[normalizedStatus] || statusConfig.failed;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.className,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            config.iconClassName,
            size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'
          )}
        />
      )}
      {showLabel && config.label}
    </span>
  );
}

/**
 * Get just the icon for compact displays
 */
export function SMSStatusIcon({ status, size = 'md' }: { status: SMSStatus | string; size?: 'sm' | 'md' }) {
  const normalizedStatus = status.toLowerCase() as SMSStatus;
  const config = statusConfig[normalizedStatus] || statusConfig.failed;
  const Icon = config.icon;

  return (
    <Icon
      className={cn(
        config.iconClassName,
        size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
      )}
    />
  );
}
