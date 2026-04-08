import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, getOne, getAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/conversations/[id]/messages — Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversationId = parseInt(params.id);
  if (isNaN(conversationId)) {
    return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
  }

  // Verify user is part of conversation
  const conversation = await getOne(
    'SELECT * FROM conversations WHERE id = $1 AND (seller_user_id = $2 OR buyer_user_id = $2)',
    [conversationId, user.id]
  );

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Mark unread messages from the other user as read
  await query(
    'UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL',
    [conversationId, user.id]
  );

  const messages = await getAll(
    'SELECT id, sender_id, content, read_at, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  );

  return NextResponse.json({ messages });
}

// POST /api/conversations/[id]/messages — Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversationId = parseInt(params.id);
  if (isNaN(conversationId)) {
    return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
  }

  // Verify user is part of conversation
  const conversation = await getOne(
    'SELECT * FROM conversations WHERE id = $1 AND (seller_user_id = $2 OR buyer_user_id = $2)',
    [conversationId, user.id]
  );

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const message = await getOne(
    'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, sender_id, content, read_at, created_at',
    [conversationId, user.id, content.trim()]
  );

  // Update conversation's updated_at
  await query(
    'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
    [conversationId]
  );

  return NextResponse.json({ message });
}
