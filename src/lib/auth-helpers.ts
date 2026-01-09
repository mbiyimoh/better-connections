import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import type { User, UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
    select: { id: true, email: true, name: true, role: true },
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
