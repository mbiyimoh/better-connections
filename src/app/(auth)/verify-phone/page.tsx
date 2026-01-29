'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Phone, ArrowRight, RefreshCw } from 'lucide-react';

type Step = 'phone' | 'otp' | 'success';

export default function VerifyPhonePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('otp');
        setResendCooldown(60);
        // Focus first OTP input
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newOtp.every((d) => d) && newOtp.join('').length === 6) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('success');
        setTimeout(() => {
          router.push('/guest/events');
        }, 1500);
      } else {
        setError(data.error || 'Invalid verification code');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await handleSendOtp();
  };

  const handleSkip = () => {
    router.push('/guest/events');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <Card className="w-full max-w-md p-8">
        {step === 'phone' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gold-subtle flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-gold-primary" />
              </div>
              <h1 className="text-xl font-semibold mb-2">Verify Your Phone</h1>
              <p className="text-text-secondary text-sm">
                Add your phone number to receive event updates and connect with other attendees.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button
                onClick={handleSendOtp}
                disabled={isLoading || !phone.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Send Verification Code
              </Button>

              <Button
                variant="ghost"
                onClick={handleSkip}
                className="w-full text-text-secondary"
              >
                Skip for now
              </Button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold mb-2">Enter Verification Code</h1>
              <p className="text-text-secondary text-sm">
                We sent a 6-digit code to {phone}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={isLoading}
                    className="w-12 h-12 text-center text-lg font-semibold"
                    maxLength={1}
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              {isLoading && (
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gold-primary" />
                </div>
              )}

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend code'}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setStep('phone')}
                className="w-full"
              >
                Change phone number
              </Button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Phone Verified!</h1>
            <p className="text-text-secondary text-sm">
              Redirecting you to your events...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
