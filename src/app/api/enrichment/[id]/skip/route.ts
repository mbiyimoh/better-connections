import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the contact belongs to the user
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Update lastEnrichedAt to push it down in the queue
    // This effectively "skips" the contact by marking it as recently touched
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        lastEnrichedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      contact: updatedContact,
    });
  } catch (error) {
    console.error("Error skipping contact:", error);
    return NextResponse.json(
      { error: "Failed to skip contact" },
      { status: 500 }
    );
  }
}
