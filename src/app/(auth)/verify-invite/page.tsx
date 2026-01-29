'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

type VerificationState = 'input' | 'verifying' | 'success' | 'error' | 'no-event';

export default function VerifyInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerificationState>('input');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [eventName, setEventName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const eventId = searchParams.get('event');

  useEffect(() => {
    if (!eventId) {
      setState('no-event');
    }
  }, [eventId]);

  const handleVerify = async () => {
    if (!email.trim() || !eventId) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setState('verifying');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setEventName(data.eventName || 'the event');

        if (data.requiresAuth) {
          // Not authenticated - redirect to login with return URL
          const returnUrl = encodeURIComponent(`/verify-invite?event=${eventId}&email=${encodeURIComponent(email)}`);
          router.push(`/login?returnTo=${returnUrl}`);
        } else {
          setState('success');
          // Redirect to phone verification or guest dashboard after delay
          setTimeout(() => {
            if (data.needsPhoneVerification) {
              router.push('/verify-phone');
            } else {
              router.push('/guest/events');
            }
          }, 2000);
        }
      } else {
        setState('error');
        setErrorMessage(data.error || 'Failed to verify invitation');
      }
    } catch {
      setState('error');
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <Card className="w-full max-w-md p-8 text-center">
        {state === 'no-event' && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h1 className="text-xl font-semibold mb-2">Invalid Link</h1>
            <p className="text-text-secondary mb-6">
              This invitation link appears to be invalid or incomplete.
            </p>
            <Button onClick={() => router.push('/login')} variant="outline">
              Go to Login
            </Button>
          </>
        )}

        {state === 'input' && (
          <>
            <div className="w-16 h-16 rounded-full bg-gold-subtle flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-gold-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Verify Your Invitation</h1>
            <p className="text-text-secondary text-sm mb-6">
              Enter the email address where you received your event invitation.
            </p>

            <div className="space-y-4">
              <div className="text-left">
                <label className="text-sm text-text-secondary mb-1 block">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}

              <Button
                onClick={handleVerify}
                disabled={isLoading || !email.trim()}
                className="w-full"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify Invitation
              </Button>
            </div>
          </>
        )}

        {state === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-gold-primary" />
            <h1 className="text-xl font-semibold mb-2">Verifying Your Invitation</h1>
            <p className="text-text-secondary">Please wait while we verify your invite...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <h1 className="text-xl font-semibold mb-2">Welcome!</h1>
            <p className="text-text-secondary mb-4">
              Your invitation to {eventName} has been verified.
            </p>
            <p className="text-sm text-text-tertiary">Redirecting you shortly...</p>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h1 className="text-xl font-semibold mb-2">Verification Failed</h1>
            <p className="text-text-secondary mb-6">{errorMessage}</p>
            <div className="space-y-2">
              <Button onClick={() => setState('input')} className="w-full">
                Try Again
              </Button>
              <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
                Go to Login
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
