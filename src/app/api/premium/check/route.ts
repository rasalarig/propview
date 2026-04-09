import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ is_premium: false, authenticated: false });
    }
    return NextResponse.json({ is_premium: user.is_premium || false, authenticated: true });
  } catch {
    return NextResponse.json({ is_premium: false, authenticated: false });
  }
}
