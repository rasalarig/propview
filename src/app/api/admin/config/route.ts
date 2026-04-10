import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll, getOne, query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - returns all platform config key-value pairs as an object
// No admin check needed for GET (commission rate is used publicly to calculate display prices)
export async function GET() {
  const rows = await getAll("SELECT key, value FROM platform_config");
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return NextResponse.json(config);
}

// PUT - update a config value (admin only)
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminCheck = await getOne("SELECT is_admin FROM users WHERE id = $1", [user.id]) as { is_admin: boolean } | null;
  if (!adminCheck?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { key, value } = body as { key?: string; value?: string };

  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const result = await query(
    "UPDATE platform_config SET value = $1, updated_at = NOW() WHERE key = $2",
    [value, key]
  );

  if (result.rowCount === 0) {
    await query(
      "INSERT INTO platform_config (key, value) VALUES ($1, $2)",
      [key, value]
    );
  }

  return NextResponse.json({ success: true, key, value });
}
