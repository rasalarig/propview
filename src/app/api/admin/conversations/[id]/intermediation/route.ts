import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, getOne } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const conversationId = parseInt(params.id);
  if (isNaN(conversationId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const body = await request.json();
  const { status, notes } = body;

  const validStatuses = ['none', 'active', 'closed'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const conversation = await getOne(
    'SELECT id FROM conversations WHERE id = $1',
    [conversationId]
  );

  if (!conversation) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  }

  const updates: string[] = ['intermediation_status = $2'];
  const values: (string | number | null)[] = [conversationId, status];
  let paramIndex = 3;

  if (status === 'active') {
    updates.push(`intermediation_started_at = NOW()`);
  }

  if (notes !== undefined) {
    updates.push(`intermediation_notes = $${paramIndex}`);
    values.push(notes);
    paramIndex++;
  }

  await query(
    `UPDATE conversations SET ${updates.join(', ')} WHERE id = $1`,
    values
  );

  return NextResponse.json({ success: true });
}
