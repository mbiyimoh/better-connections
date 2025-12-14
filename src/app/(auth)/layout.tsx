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
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-gold-primary to-gold-light text-xl font-bold text-black">
            BC
          </div>
          <h1 className="text-2xl font-bold text-white">Better Connections</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your contacts are flat. Give them some depth.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
