'use client';

import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function TokenExpiredMessage() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <Card className="bg-bg-secondary border-border max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <Clock className="w-16 h-16 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Link Expired
          </h1>
          <p className="text-text-secondary mb-4">
            This RSVP link has expired. Links are valid until 24 hours after the event.
          </p>
          <p className="text-sm text-text-tertiary">
            If you believe this is an error, please contact the event organizer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
