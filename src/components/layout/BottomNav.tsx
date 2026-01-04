'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Sparkles, MessageSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'contacts', label: 'Contacts', href: '/contacts', icon: Users },
  { id: 'enrich', label: 'Enrich', href: '/enrich', icon: Sparkles },
  { id: 'explore', label: 'Explore', href: '/explore', icon: MessageSquare },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-45',
        'h-16 pb-safe',
        'bg-bg-primary border-t border-border',
        'flex items-center justify-around',
        'md:hidden'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1',
              'min-w-[64px] h-full px-3',
              'transition-colors',
              isActive ? 'text-gold-primary' : 'text-text-secondary'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className={cn('h-6 w-6', isActive && 'fill-current')} />
            <span className={cn('text-xs', isActive ? 'font-semibold' : 'font-normal')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
