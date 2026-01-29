import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import type { User, UserRole, AccountOrigin } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hasM33tAccess?: boolean;
  // M33T Invitee Auth fields
  accountOrigin: AccountOrigin;
  betterContactsActivated: boolean;
  phone?: string | null;
  phoneVerified: boolean;
  phoneVerifiedAt?: Date | null;
}

/**
 * Get the currently authenticated user from the server context.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser?.email) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: supabaseUser.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      hasM33tAccess: true,
      // M33T Invitee Auth fields
      accountOrigin: true,
      betterContactsActivated: true,
      phone: true,
      phoneVerified: true,
      phoneVerifiedAt: true,
    },
  });

  return dbUser;
}

/**
 * Require authentication - throws if not authenticated.
 * Use in API routes that require a logged-in user.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Check if the current user has admin role.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'SYSTEM_ADMIN';
}

/**
 * Require admin role - throws if not admin.
 * Use in API routes that require admin access.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.role !== 'SYSTEM_ADMIN') {
    throw new Error('Forbidden: Admin access required');
  }

  return user;
}

/**
 * Get user by ID from database.
 */
export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

/**
 * Check if the current user has M33T Events access.
 */
export async function hasM33tAccess(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.hasM33tAccess === true;
}

/**
 * Require M33T access - throws if user doesn't have access.
 * Use in API routes that require M33T feature access.
 */
export async function requireM33tAccess(): Promise<AuthUser> {
  const user = await requireAuth();

  if (!user.hasM33tAccess) {
    throw new Error('Forbidden: M33T Events access required');
  }

  return user;
}

// ========== M33T Invitee Auth Helpers ==========

/**
 * Check if user is a M33T-only invitee (not yet activated for Better Contacts)
 */
export function isM33tInvitee(user: AuthUser): boolean {
  return user.accountOrigin === 'M33T_INVITEE' && !user.betterContactsActivated;
}

/**
 * Check if user can access Better Contacts features
 */
export function canAccessBetterContacts(user: AuthUser): boolean {
  return user.accountOrigin === 'BETTER_CONTACTS' || user.betterContactsActivated;
}

/**
 * Check if user needs to verify their phone
 */
export function needsPhoneVerification(user: AuthUser): boolean {
  return !user.phoneVerified;
}
