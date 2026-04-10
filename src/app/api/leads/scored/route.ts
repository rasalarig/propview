import { NextRequest, NextResponse } from 'next/server';
import { getAll } from '@/lib/db';

const SCORE_WEIGHTS: Record<string, number> = {
  view_half: 10,
  view_complete: 25,
  like: 15,
  share: 20,
  click_details: 30,
  click_whatsapp: 35,
  click_buy: 50,
};

function getTemperature(score: number, hasClickBuy: boolean): string {
  if (hasClickBuy) return 'convertido';
  if (score > 40) return 'quente';
  if (score >= 10) return 'morno';
  return 'frio';
}

export async function GET(request: NextRequest) {
  try {
    const temperature = request.nextUrl.searchParams.get('temperature');
    const propertyId = request.nextUrl.searchParams.get('property_id');

    // Aggregate engagement events per user per property
    let queryStr = `
      SELECT
        e.user_id,
        e.property_id,
        u.name as user_name,
        u.email as user_email,
        u.avatar_url,
        p.title as property_title,
        p.city as property_city,
        p.price as property_price,
        COUNT(*) FILTER (WHERE e.event_type = 'view_half') as view_half_count,
        COUNT(*) FILTER (WHERE e.event_type = 'view_complete') as view_complete_count,
        COUNT(*) FILTER (WHERE e.event_type = 'like') as like_count,
        COUNT(*) FILTER (WHERE e.event_type = 'share') as share_count,
        COUNT(*) FILTER (WHERE e.event_type = 'click_details') as click_details_count,
        COUNT(*) FILTER (WHERE e.event_type = 'click_whatsapp') as click_whatsapp_count,
        COUNT(*) FILTER (WHERE e.event_type = 'click_buy') as click_buy_count,
        MIN(e.created_at) as first_interaction,
        MAX(e.created_at) as last_interaction,
        COUNT(*) as total_interactions
      FROM engagement_events e
      JOIN users u ON e.user_id = u.id
      JOIN properties p ON e.property_id = p.id
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (propertyId) {
      queryStr += ` AND e.property_id = $${paramIndex}`;
      params.push(Number(propertyId));
      paramIndex++;
    }

    queryStr += ` GROUP BY e.user_id, e.property_id, u.name, u.email, u.avatar_url, p.title, p.city, p.price`;
    queryStr += ` ORDER BY MAX(e.created_at) DESC`;

    const rows = await getAll(queryStr, params);

    // Calculate scores and temperatures
    const leads = rows.map((row: Record<string, unknown>) => {
      const score =
        (Number(row.view_half_count) * SCORE_WEIGHTS.view_half) +
        (Number(row.view_complete_count) * SCORE_WEIGHTS.view_complete) +
        (Number(row.like_count) * SCORE_WEIGHTS.like) +
        (Number(row.share_count) * SCORE_WEIGHTS.share) +
        (Number(row.click_details_count) * SCORE_WEIGHTS.click_details) +
        (Number(row.click_whatsapp_count) * SCORE_WEIGHTS.click_whatsapp) +
        (Number(row.click_buy_count) * SCORE_WEIGHTS.click_buy);

      const hasClickBuy = Number(row.click_buy_count) > 0;
      const temp = getTemperature(score, hasClickBuy);

      return {
        user_id: row.user_id,
        property_id: row.property_id,
        user_name: row.user_name,
        user_email: row.user_email,
        avatar_url: row.avatar_url,
        property_title: row.property_title,
        property_city: row.property_city,
        property_price: row.property_price,
        score,
        temperature: temp,
        interactions: {
          view_half: Number(row.view_half_count),
          view_complete: Number(row.view_complete_count),
          like: Number(row.like_count),
          share: Number(row.share_count),
          click_details: Number(row.click_details_count),
          click_whatsapp: Number(row.click_whatsapp_count),
          click_buy: Number(row.click_buy_count),
          total: Number(row.total_interactions),
        },
        first_interaction: row.first_interaction,
        last_interaction: row.last_interaction,
      };
    });

    // Sort by temperature: quente first, then morno, frio, convertido; within each group by score DESC
    const tempPriority: Record<string, number> = { quente: 0, morno: 1, frio: 2, convertido: 3 };
    leads.sort((a, b) => (tempPriority[a.temperature] ?? 4) - (tempPriority[b.temperature] ?? 4) || b.score - a.score);

    // Filter by temperature if requested
    const filtered = temperature
      ? leads.filter((l: { temperature: string }) => l.temperature === temperature)
      : leads;

    // Calculate stats
    const stats = {
      total: leads.length,
      frio: leads.filter((l: { temperature: string }) => l.temperature === 'frio').length,
      morno: leads.filter((l: { temperature: string }) => l.temperature === 'morno').length,
      quente: leads.filter((l: { temperature: string }) => l.temperature === 'quente').length,
      convertido: leads.filter((l: { temperature: string }) => l.temperature === 'convertido').length,
    };

    return NextResponse.json({ leads: filtered, stats });
  } catch (error) {
    console.error('Error fetching scored leads:', error);
    return NextResponse.json({ error: 'Failed to fetch scored leads' }, { status: 500 });
  }
}
