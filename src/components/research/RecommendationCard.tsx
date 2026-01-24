'use client';

import { useState, useMemo } from 'react';
import {
  Check,
  X,
  Edit2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Twitter,
  Github,
  Instagram,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TAG_CATEGORY_COLORS } from '@/lib/design-system';
import type { TagCategory } from '@prisma/client';
import { InlineDiff } from './InlineDiff';

// Runtime URL validation to filter out hallucinated URLs from existing data
const FORBIDDEN_URL_DOMAINS = ['example.com', 'example.org', 'example.net', 'test.com', 'placeholder.com', 'localhost'];

function isValidSourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // Check forbidden domains
    const hostname = parsed.hostname.toLowerCase();
    return !FORBIDDEN_URL_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export interface Recommendation {
  id: string;
  fieldName: string;
  action: 'ADD' | 'UPDATE';
  currentValue: string | null;
  proposedValue: string;
  tagCategory: string | null;
  reasoning: string;
  confidence: number;
  sourceUrls: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  editedValue: string | null;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, editedValue: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingAction?: 'approve' | 'reject' | null;
}

const FIELD_LABELS: Record<string, string> = {
  expertise: 'Expertise',
  interests: 'Interests',
  whyNow: 'Why Now',
  notes: 'Notes',
  title: 'Job Role',
  organizationalTitle: 'Position',
  company: 'Company',
  location: 'Location',
  tags: 'Tag',
  twitterUrl: 'Twitter/X',
  githubUrl: 'GitHub',
  instagramUrl: 'Instagram',
};

const SOCIAL_FIELD_ICONS: Record<string, React.ReactNode> = {
  twitterUrl: <Twitter className="h-4 w-4" />,
  githubUrl: <Github className="h-4 w-4" />,
  instagramUrl: <Instagram className="h-4 w-4" />,
};

const isSocialField = (fieldName: string): boolean => {
  return ['twitterUrl', 'githubUrl', 'instagramUrl'].includes(fieldName);
};

export function RecommendationCard({
  recommendation,
  onApprove,
  onReject,
  onEdit,
  disabled = false,
  isLoading = false,
  loadingAction = null,
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    recommendation.editedValue || recommendation.proposedValue
  );

  const confidenceColor =
    recommendation.confidence >= 0.8
      ? 'text-green-500'
      : recommendation.confidence >= 0.6
        ? 'text-yellow-500'
        : 'text-orange-500';

  const handleSaveEdit = () => {
    onEdit(recommendation.id, editValue);
    setIsEditing(false);
  };

  const displayValue =
    recommendation.editedValue || recommendation.proposedValue;

  const tagCategoryColors = recommendation.tagCategory
    ? TAG_CATEGORY_COLORS[recommendation.tagCategory as TagCategory]
    : null;

  // Filter source URLs at render time to handle historical data with hallucinated URLs
  const validSourceUrls = useMemo(
    () => recommendation.sourceUrls.filter(isValidSourceUrl),
    [recommendation.sourceUrls]
  );

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-colors',
        recommendation.status === 'APPROVED' &&
          'border-green-500/50 bg-green-500/5',
        recommendation.status === 'REJECTED' &&
          'border-red-500/50 bg-red-500/5 opacity-60',
        recommendation.status === 'APPLIED' &&
          'border-blue-500/50 bg-blue-500/5',
        recommendation.status === 'PENDING' && 'border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1.5">
              {SOCIAL_FIELD_ICONS[recommendation.fieldName]}
              {FIELD_LABELS[recommendation.fieldName] || recommendation.fieldName}
            </Badge>
            <Badge
              variant={
                recommendation.action === 'ADD' ? 'default' : 'secondary'
              }
            >
              {recommendation.action}
            </Badge>
            {tagCategoryColors && (
              <Badge className={cn(tagCategoryColors.bg, tagCategoryColors.text)}>
                {recommendation.tagCategory}
              </Badge>
            )}
            <span className={cn('text-sm font-medium', confidenceColor)}>
              {Math.round(recommendation.confidence * 100)}% confidence
            </span>
            {/* Verify button for social profile URLs */}
            {isSocialField(recommendation.fieldName) && (
              <a
                href={displayValue}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Verify Profile
              </a>
            )}
          </div>

          {/* Value preview */}
          <div className="mt-2">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditValue(
                        recommendation.editedValue ||
                          recommendation.proposedValue
                      );
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : recommendation.action === 'UPDATE' && recommendation.currentValue ? (
              // Show inline diff for UPDATE actions - full content with strikethrough/bold-italic
              <div className="text-sm whitespace-pre-wrap">
                <InlineDiff
                  oldText={recommendation.currentValue}
                  newText={displayValue}
                />
              </div>
            ) : (
              // Show plain text for ADD actions
              <p className="text-sm whitespace-pre-wrap">{displayValue}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {recommendation.status === 'PENDING' && !isEditing && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              disabled={disabled || isLoading}
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onApprove(recommendation.id)}
              disabled={disabled || isLoading}
              className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
              title="Approve"
            >
              {isLoading && loadingAction === 'approve' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onReject(recommendation.id)}
              disabled={disabled || isLoading}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              title="Reject"
            >
              {isLoading && loadingAction === 'reject' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {recommendation.status !== 'PENDING' && (
          <Badge
            variant={
              recommendation.status === 'APPROVED'
                ? 'default'
                : recommendation.status === 'APPLIED'
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {recommendation.status}
          </Badge>
        )}
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm text-muted-foreground mt-3 hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {isExpanded ? 'Hide details' : 'Show reasoning & sources'}
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1">Reasoning</h4>
            <p className="text-sm text-muted-foreground">
              {recommendation.reasoning}
            </p>
          </div>

          {validSourceUrls.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">Sources</h4>
              <ul className="space-y-1">
                {validSourceUrls.map((url, i) => {
                  let hostname = url;
                  try {
                    hostname = new URL(url).hostname;
                  } catch {
                    // Use full URL if parsing fails
                  }
                  return (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {hostname}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
