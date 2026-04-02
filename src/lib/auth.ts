import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { query, getOne } from './db';

const COOKIE_NAME = 'session_id';
const SESSION_DURATION_DAYS = 7;

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  provider: string;
  created_at: string;
}

export function generateSessionId(): string {
  return randomUUID();
}

export async function createSession(userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [sessionId, userId, expiresAt]
  );

  return sessionId;
}

export function setSessionCookie(sessionId: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionId) return null;

  const row = await getOne(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.provider, u.created_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = $1 AND s.expires_at > NOW()`,
    [sessionId]
  );

  return row as User | null;
}

export async function logout() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;

  if (sessionId) {
    await query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  }

  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function upsertUser(email: string, name: string): Promise<User> {
  const existing = await getOne('SELECT * FROM users WHERE email = $1', [email]) as User | null;

  if (existing) {
    if (name && name !== existing.name) {
      await query('UPDATE users SET name = $1 WHERE id = $2', [name, existing.id]);
      existing.name = name;
    }
    return existing;
  }

  const result = await getOne(
    'INSERT INTO users (name, email, provider) VALUES ($1, $2, $3) RETURNING id',
    [name, email, 'local']
  );

  const user = await getOne('SELECT * FROM users WHERE id = $1', [result.id]) as User;
  return user;
}
