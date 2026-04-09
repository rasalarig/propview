import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAll, getOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
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

  const conversation = await getOne(
    `SELECT c.*,
      p.title as property_title,
      p.price as property_price,
      seller.name as seller_name,
      buyer.name as buyer_name
    FROM conversations c
    JOIN properties p ON c.property_id = p.id
    JOIN users seller ON c.seller_user_id = seller.id
    JOIN users buyer ON c.buyer_user_id = buyer.id
    WHERE c.id = $1`,
    [conversationId]
  );

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const messages = await getAll(
    `SELECT m.id, m.sender_id, m.content, m.read_at, m.created_at,
      u.name as sender_name, u.avatar_url as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = $1
    ORDER BY m.created_at ASC`,
    [conversationId]
  );

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      property_title: conversation.property_title,
      property_price: conversation.property_price,
      seller_name: conversation.seller_name,
      seller_user_id: conversation.seller_user_id,
      buyer_name: conversation.buyer_name,
      buyer_user_id: conversation.buyer_user_id,
      intermediation_status: conversation.intermediation_status || 'none',
    },
    messages,
  });
}
