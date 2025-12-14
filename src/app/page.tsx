import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, redirect to contacts
  if (user) {
    redirect('/contacts');
  }

  // Landing page for unauthenticated users
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary p-24">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-primary to-gold-light text-2xl font-bold text-black mb-8">
        BC
      </div>
      <h1 className="text-4xl font-bold text-white mb-4">Better Connections</h1>
      <p className="text-text-secondary text-lg mb-8 text-center max-w-md">
        Your contacts are flat. Give them some depth.
      </p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/login">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Get Started</Link>
        </Button>
      </div>
    </main>
  );
}
