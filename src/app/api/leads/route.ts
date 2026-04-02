import { NextRequest, NextResponse } from "next/server";
import { getOne, getAll } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const propertyId = request.nextUrl.searchParams.get("property_id");
    const status = request.nextUrl.searchParams.get("status");

    let sql = `
      SELECT l.*, p.title as property_title, p.city as property_city
      FROM leads l
      JOIN properties p ON l.property_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (propertyId) {
      sql += ` AND l.property_id = $${paramIndex++}`;
      params.push(Number(propertyId));
    }
    if (status) {
      sql += ` AND l.status = $${paramIndex++}`;
      params.push(status);
    }

    sql += " ORDER BY l.created_at DESC";

    const leads = await getAll(sql, params);

    const totalRow = await getOne("SELECT COUNT(*) as count FROM leads") as { count: string };
    const novoRow = await getOne("SELECT COUNT(*) as count FROM leads WHERE status = 'novo'") as { count: string };
    const contatadoRow = await getOne("SELECT COUNT(*) as count FROM leads WHERE status = 'contatado'") as { count: string };
    const convertidoRow = await getOne("SELECT COUNT(*) as count FROM leads WHERE status = 'convertido'") as { count: string };

    const stats = {
      total: parseInt(totalRow.count, 10),
      novo: parseInt(novoRow.count, 10),
      contatado: parseInt(contatadoRow.count, 10),
      convertido: parseInt(convertidoRow.count, 10),
    };

    return NextResponse.json({ leads, stats });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { property_id, name, phone, email, message, source = "form" } = body;

    if (!property_id || !name || !phone) {
      return NextResponse.json({ error: "Nome e telefone sao obrigatorios" }, { status: 400 });
    }

    const property = await getOne("SELECT id, title FROM properties WHERE id = $1", [property_id]);
    if (!property) {
      return NextResponse.json({ error: "Imovel nao encontrado" }, { status: 404 });
    }

    const result = await getOne(
      "INSERT INTO leads (property_id, name, phone, email, message, source) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [property_id, name, phone, email || null, message || null, source]
    );

    return NextResponse.json({ id: result.id, message: "Lead registrado com sucesso!" }, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
