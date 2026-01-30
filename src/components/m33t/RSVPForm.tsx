'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getRsvpBasePath } from '@/lib/m33t/rsvp-paths';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, X, HelpCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { normalizePhone, formatPhoneForDisplay } from '@/lib/phone';

interface RSVPFormProps {
  token: string;
  event: {
    id: string;
    name: string;
  };
  attendee: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    rsvpStatus: string;
    rsvpRespondedAt: Date | null;
    questionnaireCompletedAt: Date | null;
  };
}

export function RSVPForm({ token, event, attendee }: RSVPFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const rsvpBase = getRsvpBasePath(pathname);
  const [status, setStatus] = useState<string>(attendee.rsvpStatus);
  const [phone, setPhone] = useState(attendee.phone || '');
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatAndValidatePhone = useCallback((value: string) => {
    if (!value.trim()) {
      setPhoneValid(null);
      return;
    }
    const normalized = normalizePhone(value);
    if (normalized) {
      setPhone(formatPhoneForDisplay(normalized));
      setPhoneValid(true);
    } else {
      setPhoneValid(false);
    }
  }, []);


  // Already responded - show status
  if (attendee.rsvpRespondedAt && attendee.rsvpStatus !== 'PENDING') {
    return (
      <Card className="bg-bg-secondary border-border">
        <CardContent className="pt-6 text-center">
          <div className="mb-4">
            {attendee.rsvpStatus === 'CONFIRMED' ? (
              <Check className="w-12 h-12 text-success mx-auto" />
            ) : attendee.rsvpStatus === 'DECLINED' ? (
              <X className="w-12 h-12 text-error mx-auto" />
            ) : (
              <HelpCircle className="w-12 h-12 text-warning mx-auto" />
            )}
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {attendee.rsvpStatus === 'CONFIRMED' && "You're attending!"}
            {attendee.rsvpStatus === 'DECLINED' && "You declined this event"}
            {attendee.rsvpStatus === 'MAYBE' && "You're a maybe"}
          </h2>
          {attendee.rsvpStatus === 'CONFIRMED' && !attendee.questionnaireCompletedAt && (
            <Button
              onClick={async () => {
                // Check for question sets first
                try {
                  const res = await fetch(`/api/rsvp/${token}/question-sets`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data.questionSets?.length > 0 && data.nextSetId) {
                      router.push(`${rsvpBase}/question-sets`);
                      return;
                    }
                  }
                } catch {
                  // Fall back to legacy questionnaire
                }
                router.push(`${rsvpBase}/questionnaire`);
              }}
              className="mt-4 bg-gold-primary hover:bg-gold-light text-bg-primary"
            >
              Complete Your Profile
            </Button>
          )}
          {attendee.rsvpStatus === 'CONFIRMED' && attendee.questionnaireCompletedAt && (
            <p className="text-text-secondary mt-2">
              Profile complete! You&apos;ll receive your matches before the event.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'CONFIRMED' && !phone) {
      toast.error('Phone number is required to receive match notifications');
      return;
    }

    if (status === 'CONFIRMED' && phone && phoneValid === false) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/rsvp/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, phone: phone.trim() || undefined }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'INVALID_PHONE') {
          setPhoneValid(false);
          toast.error('Please enter a valid phone number');
          return;
        }
        throw new Error(errorData.error || 'Failed to submit RSVP');
      }

      toast.success(
        status === 'CONFIRMED'
          ? "You're in! Now let's set up your profile."
          : 'RSVP submitted successfully'
      );

      if (status === 'CONFIRMED') {
        // Check if there are published question sets to complete
        try {
          const questionSetsRes = await fetch(`/api/rsvp/${token}/question-sets`);
          if (questionSetsRes.ok) {
            const questionSetsData = await questionSetsRes.json();
            // If there are any question sets with nextSetId, redirect to question sets
            if (questionSetsData.questionSets?.length > 0 && questionSetsData.nextSetId) {
              router.push(`${rsvpBase}/question-sets`);
              return;
            }
          }
        } catch {
          // If check fails, fall back to legacy questionnaire
        }
        // No question sets or all completed, use legacy questionnaire
        router.push(`${rsvpBase}/questionnaire`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit RSVP');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-bg-secondary border-border">
      <CardHeader>
        <CardTitle>RSVP for {event.name}</CardTitle>
        <CardDescription>
          Hi {attendee.firstName}! Will you be joining us?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2" role="radiogroup">
            {[
              { value: 'CONFIRMED', label: "Yes, I'll be there!" },
              { value: 'MAYBE', label: 'Maybe' },
              { value: 'DECLINED', label: "Can't make it" },
            ].map((option) => {
              const isSelected = status === option.value;
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setStatus(option.value)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 ${
                    isSelected
                      ? 'border-gold-primary bg-gold-subtle'
                      : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
                  }`}
                >
                  {/* Custom radio dot */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-gold-primary' : 'border-zinc-600'
                  }`}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-gold-primary" />
                    )}
                  </div>
                  <span className={`font-body font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                    {option.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {status === 'CONFIRMED' && (
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number (for match notifications) *
              </Label>
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="(512) 555-0123"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    // Reset validation on typing so it re-validates on blur
                    if (phoneValid !== null) setPhoneValid(null);
                  }}
                  onBlur={() => formatAndValidatePhone(phone)}
                  className={`bg-bg-tertiary pr-10 ${
                    phoneValid === false ? 'border-error' :
                    phoneValid === true ? 'border-success' : ''
                  }`}
                />
                {phoneValid === true && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
                )}
                {phoneValid === false && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-error" />
                )}
              </div>
              {phoneValid === false && (
                <p className="text-xs text-error">
                  Please enter a valid phone number
                </p>
              )}
              <p className="text-xs text-text-secondary">
                We&apos;ll text you your curated matches before the event
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold-primary hover:bg-gold-light text-bg-primary"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Submit RSVP'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
