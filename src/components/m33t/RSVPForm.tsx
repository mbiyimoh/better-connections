'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, X, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [status, setStatus] = useState<string>(attendee.rsvpStatus);
  const [phone, setPhone] = useState(attendee.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
                      router.push(`/rsvp/${token}/question-sets`);
                      return;
                    }
                  }
                } catch {
                  // Fall back to legacy questionnaire
                }
                router.push(`/rsvp/${token}/questionnaire`);
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

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/rsvp/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, phone: phone || undefined }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit RSVP');
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
              router.push(`/rsvp/${token}/question-sets`);
              return;
            }
          }
        } catch {
          // If check fails, fall back to legacy questionnaire
        }
        // No question sets or all completed, use legacy questionnaire
        router.push(`/rsvp/${token}/questionnaire`);
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
          <RadioGroup value={status} onValueChange={setStatus}>
            <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-bg-tertiary cursor-pointer">
              <RadioGroupItem value="CONFIRMED" id="confirmed" />
              <Label htmlFor="confirmed" className="flex-1 cursor-pointer">
                <span className="text-success">Yes, I&apos;ll be there!</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-bg-tertiary cursor-pointer">
              <RadioGroupItem value="MAYBE" id="maybe" />
              <Label htmlFor="maybe" className="flex-1 cursor-pointer">
                <span className="text-warning">Maybe</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-bg-tertiary cursor-pointer">
              <RadioGroupItem value="DECLINED" id="declined" />
              <Label htmlFor="declined" className="flex-1 cursor-pointer">
                <span className="text-error">Can&apos;t make it</span>
              </Label>
            </div>
          </RadioGroup>

          {status === 'CONFIRMED' && (
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number (for match notifications) *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (512) 555-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-bg-tertiary"
              />
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
