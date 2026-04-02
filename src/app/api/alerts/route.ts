import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, getOne, getAll } from "@/lib/db";
import { runAlertAgainstAllProperties } from "@/lib/alerts";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await getAll(
      `SELECT sa.*,
        (SELECT COUNT(*) FROM alert_matches am WHERE am.alert_id = sa.id AND am.seen = 0) as unseen_count,
        (SELECT COUNT(*) FROM alert_matches am WHERE am.alert_id = sa.id) as total_matches
      FROM search_alerts sa
      WHERE sa.user_id = $1
      ORDER BY sa.created_at DESC`,
      [user.id]
    );

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const trimmedPrompt = prompt.trim();

    const result = await getOne(
      "INSERT INTO search_alerts (user_id, prompt) VALUES ($1, $2) RETURNING id",
      [user.id, trimmedPrompt]
    );

    const alertId = Number(result.id);

    // Run the prompt against all existing properties
    const matchCount = await runAlertAgainstAllProperties(alertId, trimmedPrompt);

    const alert = await getOne(
      "SELECT * FROM search_alerts WHERE id = $1",
      [alertId]
    );

    return NextResponse.json(
      { ...(alert as Record<string, unknown>), initial_matches: matchCount },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { alert_id } = body;

    if (!alert_id) {
      return NextResponse.json(
        { error: "alert_id is required" },
        { status: 400 }
      );
    }

    // Check ownership
    const alert = await getOne(
      "SELECT * FROM search_alerts WHERE id = $1 AND user_id = $2",
      [alert_id, user.id]
    );

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await query("DELETE FROM search_alerts WHERE id = $1", [alert_id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
