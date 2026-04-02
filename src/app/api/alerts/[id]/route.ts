import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, getOne, getAll } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alertId = parseInt(params.id);
    if (isNaN(alertId)) {
      return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
    }

    // Check ownership
    const alert = await getOne(
      "SELECT * FROM search_alerts WHERE id = $1 AND user_id = $2",
      [alertId, user.id]
    ) as Record<string, unknown> | null;

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Get matches with property data
    const matches = await getAll(
      `SELECT am.*, p.title, p.description, p.price, p.area, p.type,
        p.address, p.city, p.state, p.neighborhood, p.characteristics,
        p.details, p.status as property_status,
        (SELECT pi.filename FROM property_images pi WHERE pi.property_id = p.id AND pi.is_cover = 1 LIMIT 1) as cover_image,
        (SELECT pi.filename FROM property_images pi WHERE pi.property_id = p.id LIMIT 1) as first_image
      FROM alert_matches am
      JOIN properties p ON am.property_id = p.id
      WHERE am.alert_id = $1
      ORDER BY am.score DESC`,
      [alertId]
    );

    // Mark all matches as seen
    await query("UPDATE alert_matches SET seen = 1 WHERE alert_id = $1", [alertId]);

    return NextResponse.json({
      alert,
      matches: (matches as Record<string, unknown>[]).map((m) => ({
        ...m,
        characteristics: m.characteristics
          ? JSON.parse(m.characteristics as string)
          : [],
        details: m.details ? JSON.parse(m.details as string) : {},
        reasons: m.reasons ? JSON.parse(m.reasons as string) : [],
        image: m.cover_image || m.first_image || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching alert details:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alertId = parseInt(params.id);
    if (isNaN(alertId)) {
      return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
    }

    // Check ownership
    const alert = await getOne(
      "SELECT * FROM search_alerts WHERE id = $1 AND user_id = $2",
      [alertId, user.id]
    );

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "is_active must be a boolean" },
        { status: 400 }
      );
    }

    await query("UPDATE search_alerts SET is_active = $1 WHERE id = $2", [
      is_active ? 1 : 0,
      alertId,
    ]);

    const updated = await getOne(
      "SELECT * FROM search_alerts WHERE id = $1",
      [alertId]
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alertId = parseInt(params.id);
    if (isNaN(alertId)) {
      return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
    }

    // Check ownership
    const alert = await getOne(
      "SELECT * FROM search_alerts WHERE id = $1 AND user_id = $2",
      [alertId, user.id]
    );

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await query("DELETE FROM search_alerts WHERE id = $1", [alertId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
