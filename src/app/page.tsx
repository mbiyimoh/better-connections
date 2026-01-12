import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default async function Home() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, redirect to contacts
  if (user) {
    redirect('/contacts');
  }

  // Landing page for unauthenticated users - 33 Strategies Editorial Style
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Atmospheric background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/4 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: 'rgba(212, 165, 74, 0.12)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full blur-[100px]"
          style={{ background: 'rgba(212, 165, 74, 0.08)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Section marker */}
        <p className="mb-8 font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-primary">
          01 — Personal CRM
        </p>

        {/* Logo badge */}
        <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-primary to-gold-light font-display text-2xl text-black">
          33
        </div>

        {/* Main headline - Instrument Serif */}
        <h1 className="mb-6 max-w-2xl font-display text-4xl leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Your contacts are flat.{' '}
          <span className="text-gold-primary">Give them some depth.</span>
        </h1>

        {/* Subheadline - DM Sans */}
        <p className="mb-12 max-w-lg font-body text-base text-text-secondary sm:text-lg">
          Better Contacts is a personal CRM that helps you remember the{' '}
          <span className="text-white">context</span> behind every relationship —
          why they matter <span className="text-white">right now</span>.
        </p>

        {/* CTA Section - Glass card */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Button
            asChild
            className="group h-12 gap-2 bg-gold-primary px-8 font-body text-base font-medium text-black hover:bg-gold-light"
          >
            <Link href="/signup">
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 border-white/10 px-8 font-body text-base text-white hover:bg-white/5 hover:text-white"
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        {/* Bottom section marker */}
        <div className="mt-24 flex flex-col items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-text-tertiary">
            Built by 33 Strategies
          </p>
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent" />
        </div>
      </div>
    </main>
  );
}
