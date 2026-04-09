import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, getOne } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
    }

    const premiumCode = await getOne(
      `SELECT * FROM premium_codes WHERE code = $1`,
      [code.trim().toUpperCase()]
    );

    if (!premiumCode) {
      return NextResponse.json({ error: 'Código não encontrado' }, { status: 404 });
    }

    if (premiumCode.expires_at && new Date(premiumCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Código expirado' }, { status: 400 });
    }

    if (premiumCode.used_count >= premiumCode.max_uses) {
      return NextResponse.json({ error: 'Código já foi utilizado o máximo de vezes' }, { status: 400 });
    }

    // Check if already activated
    const existing = await getOne(
      `SELECT id FROM premium_activations WHERE user_id = $1 AND code_id = $2`,
      [user.id, premiumCode.id]
    );

    if (existing) {
      return NextResponse.json({ error: 'Código já ativado por você' }, { status: 400 });
    }

    // Activate
    await query(
      `INSERT INTO premium_activations (user_id, code_id) VALUES ($1, $2)`,
      [user.id, premiumCode.id]
    );

    await query(
      `UPDATE premium_codes SET used_count = used_count + 1 WHERE id = $1`,
      [premiumCode.id]
    );

    await query(
      `UPDATE users SET is_premium = TRUE WHERE id = $1`,
      [user.id]
    );

    return NextResponse.json({ success: true, message: 'Acesso Premium ativado!' });
  } catch (error) {
    console.error('Premium activation error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
