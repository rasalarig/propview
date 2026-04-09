import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAll, getOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SCORE_WEIGHTS: Record<string, number> = {
  view_half: 10,
  view_complete: 25,
  like: 15,
  share: 20,
  click_details: 30,
  click_whatsapp: 35,
  click_buy: 50,
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const conversations = await getAll(`
    SELECT c.*,
      p.title as property_title,
      p.price as property_price,
      p.city as property_city,
      seller.name as seller_name,
      seller.email as seller_email,
      seller.avatar_url as seller_avatar,
      buyer.name as buyer_name,
      buyer.email as buyer_email,
      buyer.avatar_url as buyer_avatar
    FROM conversations c
    JOIN properties p ON c.property_id = p.id
    JOIN users seller ON c.seller_user_id = seller.id
    JOIN users buyer ON c.buyer_user_id = buyer.id
    ORDER BY c.updated_at DESC
  `);

  const result = [];
  for (const conv of conversations as any[]) {
    // Message count and last message
    const msgStats = await getOne(
      `SELECT COUNT(*)::int as total_messages,
        MAX(created_at) as last_message_at
      FROM messages WHERE conversation_id = $1`,
      [conv.id]
    );

    const lastMessage = await getOne(
      `SELECT m.content, m.created_at, u.name as sender_name
      FROM messages m JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC LIMIT 1`,
      [conv.id]
    );

    // Engagement score for this buyer+property pair
    const events = await getAll(
      `SELECT event_type FROM engagement_events
      WHERE user_id = $1 AND property_id = $2`,
      [conv.buyer_user_id, conv.property_id]
    );

    let score = 0;
    let hasClickBuy = false;
    for (const e of events as any[]) {
      score += SCORE_WEIGHTS[e.event_type] || 0;
      if (e.event_type === 'click_buy') hasClickBuy = true;
    }

    let temperature = 'frio';
    if (hasClickBuy) temperature = 'convertido';
    else if (score > 40) temperature = 'quente';
    else if (score >= 10) temperature = 'morno';

    result.push({
      id: conv.id,
      property_id: conv.property_id,
      property_title: conv.property_title,
      property_price: conv.property_price,
      property_city: conv.property_city,
      seller: { id: conv.seller_user_id, name: conv.seller_name, email: conv.seller_email, avatar_url: conv.seller_avatar },
      buyer: { id: conv.buyer_user_id, name: conv.buyer_name, email: conv.buyer_email, avatar_url: conv.buyer_avatar },
      total_messages: msgStats?.total_messages || 0,
      last_message: lastMessage ? { content: lastMessage.content, created_at: lastMessage.created_at, sender_name: lastMessage.sender_name } : null,
      engagement_score: score,
      temperature,
      intermediation_status: conv.intermediation_status || 'none',
      updated_at: conv.updated_at,
    });
  }

  return NextResponse.json({ conversations: result });
}
