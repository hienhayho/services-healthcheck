import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'hc_token'
const TOKEN_TTL = '7d'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val || val === '__unset__') {
    throw new Error(
      `[auth] Missing required environment variable: ${name}\n` +
      `Set it in .env.local or pass it via docker run --env ${name}=...`
    )
  }
  return val
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret === 'build-time-placeholder') {
    throw new Error(
      '[auth] Missing required environment variable: AUTH_SECRET\n' +
      'Set a long random string in .env.local or via docker run --env AUTH_SECRET=...'
    )
  }
  return new TextEncoder().encode(secret)
}

export async function signToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return { username: payload.username as string }
  } catch {
    return null
  }
}

export function validateCredentials(username: string, password: string): boolean {
  const expectedUser = requireEnv('AUTH_USERNAME')
  const expectedPass = requireEnv('AUTH_PASSWORD')
  return username === expectedUser && password === expectedPass
}

export { COOKIE_NAME }
