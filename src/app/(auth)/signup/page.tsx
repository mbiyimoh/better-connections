'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp } from '@/lib/auth';
import { cn } from '@/lib/utils';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

type SignupFormData = z.infer<typeof signupSchema>;

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

export default function SignupPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  // M33T invitee params for auth callback linking
  const nextUrl = searchParams.get('next');
  const isM33tInvitee = searchParams.get('m33t_invitee') === 'true';
  const attendeeId = searchParams.get('attendee_id');
  const prefillEmail = searchParams.get('email');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: prefillEmail || '',
    },
  });

  const password = watch('password', '');

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build email redirect URL with M33T params for account linking
      let emailRedirectTo: string | undefined;
      if (isM33tInvitee && attendeeId) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const callbackParams = new URLSearchParams({
          next: nextUrl || '/guest/events',
          m33t_invitee: 'true',
          attendee_id: attendeeId,
        });
        emailRedirectTo = `${baseUrl}/auth/callback?${callbackParams.toString()}`;
      }

      await signUp(data.email, data.password, data.name, emailRedirectTo);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
          <Check className="h-6 w-6 text-green-400" />
        </div>
        <h2 className="mb-2 font-display text-xl text-white">Check your email</h2>
        <p className="mb-6 font-body text-[#888888]">
          We&apos;ve sent you a confirmation link. Please check your email to verify your account.
        </p>
        <Button asChild variant="outline" className="w-full border-white/10 hover:bg-white/5">
          <Link href="/login">Back to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
      {/* Section marker */}
      <p className="mb-4 text-center font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-primary">
        Create Account
      </p>
      <div className="mb-6 text-center">
        <h2 className="font-display text-xl text-white">Get started</h2>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Begin building deeper connections
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            {...register('name')}
            className={errors.name ? 'border-destructive' : ''}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register('email')}
            className={errors.email ? 'border-destructive' : ''}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              {...register('password')}
              className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* Password Requirements */}
          <div className="mt-2 space-y-1">
            {passwordRequirements.map((req, i) => {
              const met = req.test(password);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {met ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <X className="h-3 w-3 text-text-tertiary" />
                  )}
                  <span className={cn(met ? 'text-green-400' : 'text-text-tertiary')}>
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link
          href={isM33tInvitee ? `/login?${searchParams.toString()}` : '/login'}
          className="text-gold-primary hover:text-gold-light"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
