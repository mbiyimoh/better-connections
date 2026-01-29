/**
 * POST /api/auth/verify-phone
 *
 * Verify an OTP code and mark the user's phone as verified.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { hashOTP, isOTPExpired, MAX_ATTEMPTS, normalizePhone } from '@/lib/m33t/phone-verification';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, phone } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize the phone number for comparison
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Find pending OTP for user and specific phone (most recent, not yet verified)
    const otpRecord = await prisma.phoneVerificationOTP.findFirst({
      where: {
        userId: user.id,
        phone: normalizedPhone,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'No pending verification' },
        { status: 400 }
      );
    }

    // Check expiration
    if (isOTPExpired(otpRecord.expiresAt)) {
      return NextResponse.json(
        { error: 'Code expired' },
        { status: 400 }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many attempts' },
        { status: 400 }
      );
    }

    // Increment attempts (do this before verification to prevent timing attacks)
    await prisma.phoneVerificationOTP.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify code
    const hashedInput = hashOTP(code);
    if (hashedInput !== otpRecord.code) {
      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 400 }
      );
    }

    // Mark OTP as verified and update user's phone fields atomically
    await prisma.$transaction([
      prisma.phoneVerificationOTP.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          phone: otpRecord.phone,
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error('Verify phone error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
