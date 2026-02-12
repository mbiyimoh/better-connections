'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Check, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { formatRelativeTime } from '@/lib/utils';
import { SynthesisSummary } from '@/components/clarity-canvas/SynthesisSummary';
import { SynthesisDetails } from '@/components/clarity-canvas/SynthesisDetails';
import { DisconnectDialog } from '@/components/clarity-canvas/DisconnectDialog';
import type { BaseSynthesis, SynthesisResponse } from '@/lib/clarity-canvas/types';

interface ClarityCanvasCardProps {
  initialConnected?: boolean;
  initialSynthesis?: BaseSynthesis | null;
  initialSyncedAt?: string | null;
}

export function ClarityCanvasCard({
  initialConnected = false,
  initialSynthesis = null,
  initialSyncedAt = null,
}: ClarityCanvasCardProps) {
  const router = useRouter();
  const [connected, setConnected] = useState(initialConnected);
  const [synthesis, setSynthesis] = useState<BaseSynthesis | null>(initialSynthesis);
  const [syncedAt, setSyncedAt] = useState<string | null>(initialSyncedAt);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Sync state when props change (e.g., after OAuth callback completes)
  useEffect(() => {
    setConnected(initialConnected);
    setSynthesis(initialSynthesis);
    setSyncedAt(initialSyncedAt);
  }, [initialConnected, initialSynthesis, initialSyncedAt]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/api/clarity-canvas/auth/start', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start OAuth flow');
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error('[clarity-canvas] Connect error:', error);
      toast({
        title: 'Connection failed',
        description: 'Unable to connect to Clarity Canvas. Please try again.',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/clarity-canvas/synthesis?refresh=true');
      if (!response.ok) throw new Error('Refresh failed');

      const data: SynthesisResponse = await response.json();
      setSynthesis(data.synthesis);
      setSyncedAt(data.syncedAt);

      toast({
        title: 'Refreshed',
        description: 'Your Clarity Canvas profile has been updated.',
      });
    } catch (error) {
      console.error('[clarity-canvas] Refresh error:', error);
      toast({
        title: 'Refresh failed',
        description: 'Unable to refresh your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    const response = await fetch('/api/clarity-canvas/auth/disconnect', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Disconnect failed');
    }

    setConnected(false);
    setSynthesis(null);
    setSyncedAt(null);

    toast({
      title: 'Disconnected',
      description: 'Your Clarity Canvas has been disconnected.',
    });

    router.refresh();
  };

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Link2 size={20} className="text-gold-primary" />
          Integrations
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Connect external services to enhance your experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connected ? (
          // Connected State
          <div className="rounded-lg border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-green-500/10 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Check size={18} className="text-green-500" />
                <span className="text-white font-medium">Clarity Canvas Connected</span>
              </div>
              <div className="flex items-center gap-2">
                {syncedAt && (
                  <span className="text-xs text-zinc-500">
                    Last synced: {formatRelativeTime(syncedAt)}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-8 px-2 text-zinc-400 hover:text-white"
                >
                  {refreshing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {synthesis ? (
                <>
                  {/* Summary */}
                  <SynthesisSummary synthesis={synthesis} />

                  {/* Expandable Details */}
                  <div>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="text-sm text-gold-primary hover:text-gold-light transition-colors"
                    >
                      {showDetails ? '▼ Hide Details' : '▶ View Details'}
                    </button>
                    {showDetails && (
                      <div className="mt-3">
                        <SynthesisDetails synthesis={synthesis} defaultExpanded />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Connected but no synthesis yet
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-400 mb-3">
                    Connection established. Click refresh to load your profile data.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} className="mr-2" />
                        Load Profile Data
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDisconnect(true)}
                className="text-zinc-500 hover:text-red-400"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          // Disconnected State
          <div className="rounded-lg border border-white/10 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gold-subtle mx-auto flex items-center justify-center mb-4">
              <Link2 size={24} className="text-gold-primary" />
            </div>
            <h3 className="text-white font-medium mb-2">Clarity Canvas</h3>
            <p className="text-sm text-zinc-400 mb-4 max-w-sm mx-auto">
              Connect your 33 Strategies profile to get personalized contact
              recommendations based on your goals and personas
            </p>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-gold-primary hover:bg-gold-light text-black"
            >
              {connecting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect Clarity Canvas'
              )}
            </Button>
          </div>
        )}

        <DisconnectDialog
          open={showDisconnect}
          onOpenChange={setShowDisconnect}
          onConfirm={handleDisconnect}
        />
      </CardContent>
    </Card>
  );
}
