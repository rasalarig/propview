import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { property_ids } = await request.json();

    if (!Array.isArray(property_ids) || property_ids.length === 0) {
      return NextResponse.json({ error: 'property_ids array is required' }, { status: 400 });
    }

    const user = await getCurrentUser();
    const result: Record<number, { favorited: boolean; likes_count: number }> = {};

    // Get likes counts for all requested properties using ANY
    const likeCounts = await getAll(
      `SELECT property_id, COUNT(*) as count FROM favorites WHERE property_id = ANY($1::int[]) GROUP BY property_id`,
      [property_ids]
    ) as Array<{ property_id: number; count: string }>;

    const likeCountMap: Record<number, number> = {};
    for (const row of likeCounts) {
      likeCountMap[row.property_id] = parseInt(row.count, 10);
    }

    // Get user's favorites if logged in
    let userFavorites: Set<number> = new Set();
    if (user) {
      const favRows = await getAll(
        `SELECT property_id FROM favorites WHERE user_id = $1 AND property_id = ANY($2::int[])`,
        [user.id, property_ids]
      ) as Array<{ property_id: number }>;
      userFavorites = new Set(favRows.map(r => r.property_id));
    }

    for (const id of property_ids) {
      result[id] = {
        favorited: userFavorites.has(id),
        likes_count: likeCountMap[id] || 0,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Favorites batch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
