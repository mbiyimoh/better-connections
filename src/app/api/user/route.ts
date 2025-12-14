import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all user's contacts (cascade deletes tags via onDelete: Cascade)
    await prisma.contact.deleteMany({
      where: { userId: user.id },
    });

    // Delete user record from our database
    await prisma.user.delete({
      where: { id: user.id },
    }).catch(() => {
      // User might not exist in our DB yet (if using Supabase auth only)
    });

    // Note: To fully delete the Supabase auth user, you would need
    // the service role key and admin API. For now, we clear user data
    // and the user can contact support for full account deletion.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
