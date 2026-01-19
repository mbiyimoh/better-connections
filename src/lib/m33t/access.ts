/**
 * M33T Access Control
 *
 * Centralized access control for M33T Events feature.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Check if a user has M33T Events access.
 * Use this in API routes after authentication.
 */
export async function checkM33tAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasM33tAccess: true },
  });
  return user?.hasM33tAccess === true;
}

/**
 * Standard 403 response for M33T access denial.
 */
export function m33tAccessDeniedResponse() {
  return NextResponse.json(
    { error: 'M33T Events access required', code: 'FORBIDDEN', retryable: false },
    { status: 403 }
  );
}
