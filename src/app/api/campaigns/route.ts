import { NextRequest, NextResponse } from 'next/server';
import { query, getAll, getOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const campaigns = await getAll(`
      SELECT c.*,
        (SELECT COUNT(*) FROM campaign_recipients cr WHERE cr.campaign_id = c.id) as recipient_count,
        (SELECT COUNT(*) FROM campaign_recipients cr WHERE cr.campaign_id = c.id AND cr.opened_at IS NOT NULL) as opened_count,
        p.title as property_title
      FROM campaigns c
      LEFT JOIN properties p ON c.property_id = p.id
      ORDER BY c.created_at DESC
    `);
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, target_temperature, property_id } = body;

    if (!title || !message || !target_temperature) {
      return NextResponse.json({ error: 'title, message and target_temperature required' }, { status: 400 });
    }

    // Validate target_temperature against DB constraint
    const validTemperatures = ['frio', 'morno', 'quente', 'todos'];
    if (!validTemperatures.includes(target_temperature)) {
      return NextResponse.json({ error: 'Invalid target_temperature' }, { status: 400 });
    }

    // Create campaign
    const campaign = await getOne(
      `INSERT INTO campaigns (title, message, target_temperature, property_id, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, message, target_temperature, property_id || null, user.id]
    );

    // Find matching leads based on temperature
    let leadsQuery = `
      SELECT e.user_id,
        SUM(CASE WHEN e.event_type = 'view_half' THEN 10
                 WHEN e.event_type = 'view_complete' THEN 25
                 WHEN e.event_type = 'like' THEN 15
                 WHEN e.event_type = 'share' THEN 20
                 WHEN e.event_type = 'click_details' THEN 30
                 WHEN e.event_type = 'click_whatsapp' THEN 35
                 WHEN e.event_type = 'click_buy' THEN 50
                 ELSE 0 END) as score,
        BOOL_OR(e.event_type = 'click_buy') as has_buy
      FROM engagement_events e
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (property_id) {
      leadsQuery += ` WHERE e.property_id = $${paramIdx}`;
      params.push(property_id);
      paramIdx++;
    }

    leadsQuery += ` GROUP BY e.user_id`;

    const scoredLeads = await getAll(leadsQuery, params);

    // Filter by temperature using same scoring logic as leads thermometer
    const matchingUserIds = scoredLeads.filter((lead: Record<string, unknown>) => {
      const score = Number(lead.score);
      const hasBuy = lead.has_buy;
      if (target_temperature === 'todos') return true;
      if (target_temperature === 'quente') return score > 40 || hasBuy;
      if (target_temperature === 'morno') return score >= 10 && score <= 40;
      if (target_temperature === 'frio') return score < 10;
      return false;
    }).map((lead: Record<string, unknown>) => lead.user_id);

    // Insert recipients
    for (const userId of matchingUserIds) {
      await query(
        'INSERT INTO campaign_recipients (campaign_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [campaign.id, userId]
      );
    }

    return NextResponse.json({
      campaign,
      recipients_count: matchingUserIds.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
