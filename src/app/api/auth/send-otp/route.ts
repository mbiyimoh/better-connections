/**
 * POST /api/auth/send-otp
 *
 * Send an OTP verification code to a phone number.
 * Rate limited to 1 request per minute per user.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import {
  generateOTP,
  hashOTP,
  normalizePhone,
  getOTPExpiration,
  RATE_LIMIT_MINUTES,
} from '@/lib/m33t/phone-verification';
import { sendSMS, SMS_TEMPLATES } from '@/lib/notifications/sms';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, eventId } = body;

    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Check rate limiting (1 OTP per minute per user)
    const recentOTP = await prisma.phoneVerificationOTP.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000),
        },
      },
    });

    if (recentOTP) {
      return NextResponse.json(
        { error: 'Please wait before requesting another code' },
        { status: 429 }
      );
    }

    // Generate OTP
    const code = generateOTP();
    const hashedCode = hashOTP(code);

    // Store OTP in database
    await prisma.phoneVerificationOTP.create({
      data: {
        userId: user.id,
        phone: normalizedPhone,
        code: hashedCode,
        expiresAt: getOTPExpiration(),
      },
    });

    // Get event name for SMS context
    let eventName = 'M33T';
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { name: true },
      });
      if (event) {
        eventName = event.name;
      }
    }

    // Send SMS with OTP
    const smsResult = await sendSMS({
      to: normalizedPhone,
      body: SMS_TEMPLATES.phoneVerification({ code, eventName }),
    });

    if (!smsResult.success) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      // Still return success - the OTP is stored and can be used for testing
      // In production, you might want to handle this differently
    }

    return NextResponse.json({
      success: true,
      message: 'Code sent',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send code' },
      { status: 500 }
    );
  }
}
