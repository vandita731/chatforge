import { jwtVerify } from 'jose'
import { Context, Next } from 'hono'

export async function authMiddleware(c: Context, next: Next) {
  const authorization = c.req.header('Authorization')

  if (!authorization) {
    return c.json({ error: 'No token provided' }, 401)
  }

  const token = authorization.split(' ')[1]

  if (!token) {
    return c.json({ error: 'Invalid token format' }, 401)
  }

  try {
    const result = await jwtVerify(
      token,
      new TextEncoder().encode(c.env.JWT_ACCESS_SECRET)
    )
    c.set('userId', result.payload.userId)
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  await next()
}