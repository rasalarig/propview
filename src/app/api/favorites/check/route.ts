import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');

    if (!propertyId) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
    }

    const likesCount = await getOne(
      'SELECT COUNT(*) as count FROM favorites WHERE property_id = $1',
      [Number(propertyId)]
    ) as { count: string };

    const user = await getCurrentUser();
    let favorited = false;

    if (user) {
      const existing = await getOne(
        'SELECT id FROM favorites WHERE user_id = $1 AND property_id = $2',
        [user.id, Number(propertyId)]
      ) as { id: number } | null;
      favorited = !!existing;
    }

    return NextResponse.json({
      favorited,
      likes_count: parseInt(likesCount.count, 10),
    });
  } catch (error) {
    console.error('Favorites check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
