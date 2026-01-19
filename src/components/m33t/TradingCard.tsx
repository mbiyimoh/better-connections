'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronUp, Sparkles, MessageCircle, Target, Gift } from 'lucide-react';
import type { TradingCardL1, TradingCardL2, TradingCardL3 } from '@/lib/m33t/schemas';

type CardLevel = 'L1' | 'L2' | 'L3';

interface TradingCardProps {
  data: TradingCardL1 | TradingCardL2 | TradingCardL3;
  level?: CardLevel;
  expandable?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

function isL2(data: TradingCardL1 | TradingCardL2 | TradingCardL3): data is TradingCardL2 {
  return 'expertise' in data;
}

function isL3(data: TradingCardL1 | TradingCardL2 | TradingCardL3): data is TradingCardL3 {
  return 'whyMatch' in data && 'conversationStarters' in data;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TradingCard({
  data,
  level = 'L2',
  expandable = true,
  defaultExpanded = false,
  className = '',
}: TradingCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const showL2 = (level === 'L2' || level === 'L3') && isL2(data);
  const showL3 = level === 'L3' && isL3(data);
  const canExpand = expandable && isL3(data) && level !== 'L3';

  return (
    <Card className={`bg-bg-secondary border-border overflow-hidden ${className}`}>
      <CardContent className="p-0">
        {/* L1: Core Identity */}
        <div className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 border-2 border-gold-primary/30">
              <AvatarImage src={data.photoUrl || undefined} alt={data.name} />
              <AvatarFallback className="bg-bg-tertiary text-gold-primary font-semibold">
                {getInitials(data.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-text-primary truncate">
                {data.name}
              </h3>
              {data.headline && (
                <p className="text-sm text-text-secondary truncate">
                  {data.headline}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* L2: Enhanced Details */}
        {showL2 && (
          <div className="px-4 pb-4 space-y-3">
            {/* Expertise Tags */}
            {data.expertise && data.expertise.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.expertise.slice(0, 4).map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-gold-subtle text-gold-primary border-0 text-xs"
                  >
                    {skill}
                  </Badge>
                ))}
                {data.expertise.length > 4 && (
                  <Badge variant="outline" className="text-xs text-text-tertiary">
                    +{data.expertise.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Current Focus */}
            {data.currentFocus && (
              <p className="text-sm text-text-secondary">
                <Sparkles className="inline w-3.5 h-3.5 mr-1.5 text-gold-primary" />
                {data.currentFocus}
              </p>
            )}
          </div>
        )}

        {/* L3: Match Context (expandable section) */}
        <AnimatePresence>
          {(showL3 || (isExpanded && isL3(data))) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
                {/* Why Match */}
                {isL3(data) && data.whyMatch && data.whyMatch.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2 flex items-center">
                      <Target className="w-3.5 h-3.5 mr-1.5" />
                      Why You Should Connect
                    </h4>
                    <ul className="space-y-1.5">
                      {data.whyMatch.map((reason, index) => (
                        <li key={index} className="text-sm text-text-secondary flex items-start">
                          <span className="text-gold-primary mr-2">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Seeking & Offering */}
                {isL3(data) && (data.seekingSummary || data.offeringSummary) && (
                  <div className="grid grid-cols-2 gap-3">
                    {data.seekingSummary && (
                      <div className="bg-bg-tertiary/50 rounded-lg p-3">
                        <h5 className="text-xs font-medium text-text-tertiary mb-1 flex items-center">
                          <Target className="w-3 h-3 mr-1" />
                          Looking for
                        </h5>
                        <p className="text-xs text-text-secondary line-clamp-2">
                          {data.seekingSummary}
                        </p>
                      </div>
                    )}
                    {data.offeringSummary && (
                      <div className="bg-bg-tertiary/50 rounded-lg p-3">
                        <h5 className="text-xs font-medium text-text-tertiary mb-1 flex items-center">
                          <Gift className="w-3 h-3 mr-1" />
                          Can help with
                        </h5>
                        <p className="text-xs text-text-secondary line-clamp-2">
                          {data.offeringSummary}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Conversation Starters */}
                {isL3(data) && data.conversationStarters && data.conversationStarters.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2 flex items-center">
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      Conversation Starters
                    </h4>
                    <ul className="space-y-1.5">
                      {data.conversationStarters.map((starter, index) => (
                        <li key={index} className="text-sm text-text-secondary italic">
                          &ldquo;{starter}&rdquo;
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expand/Collapse Button */}
        {canExpand && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full rounded-none border-t border-border text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact trading card for list views
 */
export function TradingCardCompact({
  data,
  onClick,
  className = '',
}: {
  data: TradingCardL1;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Card
      className={`bg-bg-secondary border-border cursor-pointer hover:border-gold-primary/50 transition-colors ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={data.photoUrl || undefined} alt={data.name} />
            <AvatarFallback className="bg-bg-tertiary text-gold-primary text-sm">
              {getInitials(data.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-text-primary truncate">
              {data.name}
            </h4>
            {data.headline && (
              <p className="text-xs text-text-secondary truncate">
                {data.headline}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
