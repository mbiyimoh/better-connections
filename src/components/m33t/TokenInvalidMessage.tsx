'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function TokenInvalidMessage() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <Card className="bg-bg-secondary border-border max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Invalid Link
          </h1>
          <p className="text-text-secondary mb-4">
            This RSVP link is not valid. Please check that you&apos;re using the complete link from your invitation.
          </p>
          <p className="text-sm text-text-tertiary">
            If you continue to have issues, please contact the event organizer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
