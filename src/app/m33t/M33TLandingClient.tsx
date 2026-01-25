'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Target, Zap, Users } from 'lucide-react';
import { BRAND_GOLD } from '@/lib/design-system';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Benefits data
const benefits = [
  {
    icon: Target,
    title: 'End random networking',
    description: 'Find the 3-4 people who actually align with your goals.',
  },
  {
    icon: Zap,
    title: 'Know who to meet & why',
    description: 'AI surfaces matches with specific reasons to connect.',
  },
  {
    icon: Users,
    title: 'Two-sided intent',
    description: 'They know to find you too. Both sides arrive prepared.',
  },
];

export function M33TLandingClient() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#f5f5f5] overflow-hidden">
      {/* Hero Section */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-6 md:px-12 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
            style={{
              border: `1px solid ${BRAND_GOLD.primary}`,
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-[0.06]"
            style={{
              border: `1px solid ${BRAND_GOLD.primary}`,
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full opacity-[0.08]"
            style={{
              border: `1px solid ${BRAND_GOLD.primary}`,
            }}
          />
        </div>

        <motion.div
          className="relative z-10 text-center max-w-4xl mx-auto"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          {/* Logo */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Link href="/" className="inline-block">
              <span className="font-display text-2xl text-[#888888] hover:text-[#f5f5f5] transition-colors">
                M33T: AI-First Event Experiences
              </span>
            </Link>
          </motion.div>

          {/* Badge */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <span
              className="inline-block px-4 py-2 rounded-full font-mono text-xs font-medium tracking-[0.1em] uppercase"
              style={{
                backgroundColor: 'rgba(212, 165, 74, 0.1)',
                border: '1px solid rgba(212, 165, 74, 0.3)',
                color: BRAND_GOLD.primary,
              }}
            >
              Available by Invite
            </span>
          </motion.div>

          {/* Product Label */}
          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="font-mono text-sm font-semibold tracking-[0.05em] uppercase text-[#555555] mb-2"
          >
            Alias:
          </motion.p>

          {/* Product Name */}
          <motion.h1
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl mb-8"
          >
            <span style={{ color: BRAND_GOLD.primary }}>Better</span>{' '}
            <span className="text-[#f5f5f5]">Networking</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-display text-xl md:text-2xl lg:text-3xl text-[#888888] leading-relaxed"
          >
            The right people. The right context.{' '}
            <span className="italic" style={{ color: BRAND_GOLD.primary }}>
              BEFORE
            </span>
            {'  '}you arrive.
          </motion.p>
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-24 px-6 md:px-12">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: '#111114',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <benefit.icon
                  className="w-7 h-7 mb-4"
                  strokeWidth={1.5}
                  style={{ color: BRAND_GOLD.primary }}
                />
                <h3 className="font-body text-lg font-semibold text-[#f5f5f5] mb-2">
                  {benefit.title}
                </h3>
                <p className="font-body text-sm text-[#888888] leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 px-6 md:px-12">
        <motion.div
          className="text-center"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
        >
          <a
            href="https://33strategies.ai/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-lg font-body text-base font-semibold transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${BRAND_GOLD.primary}`,
              color: BRAND_GOLD.primary,
            }}
          >
            Request Access
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <Link href="/" className="font-display text-lg text-[#888888] hover:text-[#f5f5f5] transition-colors">
            Better Contacts
          </Link>

          <Link
            href="/products"
            className="font-body text-sm text-[#555555] hover:text-[#888888] transition-colors"
          >
            View All Products
          </Link>

          <p className="font-body text-sm text-[#555555]">
            &copy; 2026 33 Strategies. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
