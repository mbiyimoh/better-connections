import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is already logged in, redirect to contacts
  if (user) {
    redirect('/contacts');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f] p-4">
      {/* Atmospheric background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/4 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
          style={{ background: 'rgba(212, 165, 74, 0.08)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo - 33 Strategies style */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-gold-primary to-gold-light font-display text-xl text-black">
            33
          </div>
          <h1 className="font-display text-2xl text-white">Better Connections</h1>
          <p className="mt-2 font-body text-sm text-text-secondary">
            Your contacts are flat.{' '}
            <span className="text-gold-primary">Give them some depth.</span>
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
