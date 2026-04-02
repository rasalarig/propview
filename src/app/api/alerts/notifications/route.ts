import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOne } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ unseen_count: 0 });
    }

    const result = await getOne(
      `SELECT COUNT(*) as unseen_count
      FROM alert_matches am
      JOIN search_alerts sa ON am.alert_id = sa.id
      WHERE sa.user_id = $1 AND am.seen = 0`,
      [user.id]
    ) as { unseen_count: string };

    return NextResponse.json({ unseen_count: parseInt(result.unseen_count, 10) });
  } catch (error) {
    console.error("Error fetching alert notifications:", error);
    return NextResponse.json({ unseen_count: 0 });
  }
}
