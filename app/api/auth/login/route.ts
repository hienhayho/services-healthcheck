import { NextRequest, NextResponse } from 'next/server'
import { validateCredentials, signToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, password } = body ?? {}

  if (!username || !password || !validateCredentials(username, password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signToken(username)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
