import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/conversations/unread — Get total unread count
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const row = await getOne(
    `SELECT COUNT(*)::int as unread_count
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE (c.seller_user_id = $1 OR c.buyer_user_id = $1)
       AND m.sender_id != $1
       AND m.read_at IS NULL`,
    [user.id]
  );

  return NextResponse.json({ unread_count: row?.unread_count || 0 });
}
