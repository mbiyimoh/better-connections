'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users,
  Sparkles,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const navItems: NavItem[] = [
  { id: 'contacts', label: 'Contacts', href: '/contacts', icon: Users },
  { id: 'enrich', label: 'Enrich', href: '/enrich', icon: Sparkles },
  { id: 'explore', label: 'Explore', href: '/explore', icon: MessageSquare },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
  contactCount?: number;
  enrichQueueCount?: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const hue = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 60%, 40%)`;
}

export function Sidebar({ user, contactCount, enrichQueueCount }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const getBadge = (id: string): string | number | undefined => {
    if (id === 'contacts' && contactCount) return contactCount;
    if (id === 'enrich' && enrichQueueCount) return enrichQueueCount;
    return undefined;
  };

  const userName = user?.name || 'User';
  const userEmail = user?.email || '';

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-bg-primary border border-border md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'flex h-screen flex-col border-r border-border bg-bg-primary transition-all duration-200',
          // Desktop styles
          'hidden md:flex',
          isCollapsed ? 'w-16' : 'w-60',
          // Mobile styles
          isMobileOpen && 'fixed inset-y-0 left-0 z-50 flex w-64'
        )}
      >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-border',
          isCollapsed ? 'px-3 py-5' : 'px-4 py-5'
        )}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold-primary to-gold-light text-base font-bold text-black">
          BC
        </div>
        {!isCollapsed && (
          <span className="text-[15px] font-semibold text-white">Better Connections</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badge = getBadge(item.id);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 transition-all',
                isCollapsed && 'justify-center px-3',
                isActive
                  ? 'border-gold-primary bg-gold-subtle text-white'
                  : 'border-transparent text-text-secondary hover:bg-white/[0.03] hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? 'text-gold-primary' : 'text-text-secondary group-hover:text-white'
                )}
              />
              {!isCollapsed && (
                <>
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      isActive ? 'font-medium' : 'font-normal'
                    )}
                  >
                    {item.label}
                  </span>
                  {badge && (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-text-tertiary">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'w-full text-text-tertiary hover:text-white',
            isCollapsed ? 'justify-center' : 'justify-start'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">Collapse</span>
            </>
          )}
        </Button>
      </div>

      {/* User Menu */}
      <div
        className={cn(
          'border-t border-border',
          isCollapsed ? 'p-2' : 'p-3'
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/[0.03]',
                isCollapsed && 'justify-center'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  style={{ background: getAvatarColor(userName) }}
                  className="text-xs font-medium text-white/90"
                >
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="truncate text-sm font-medium text-white">
                    {userName}
                  </div>
                  <div className="truncate text-xs text-text-tertiary">
                    {userEmail}
                  </div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
    </>
  );
}
