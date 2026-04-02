import { NextRequest, NextResponse } from "next/server";
import { query, getOne } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;
    const id = Number(params.id);

    if (!status || !["novo", "contatado", "convertido", "descartado"].includes(status)) {
      return NextResponse.json({ error: "Status invalido" }, { status: 400 });
    }

    await query("UPDATE leads SET status = $1 WHERE id = $2", [status, id]);
    const lead = await getOne("SELECT * FROM leads WHERE id = $1", [id]);

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await query("DELETE FROM leads WHERE id = $1", [Number(params.id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
