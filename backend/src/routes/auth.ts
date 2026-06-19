import { Hono } from 'hono'
import { jwtVerify, SignJWT } from 'jose'
import { createDb } from '../lib/prisma'
import { hashPassword, verifyPassword } from '../lib/crypto'

type Bindings = {
    DATABASE_URL: string
    JWT_ACCESS_SECRET: string
    JWT_REFRESH_SECRET: string
}

const auth = new Hono<{ Bindings: Bindings }>()

auth.post('/register', async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const { email, password, name } = await c.req.json()

    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400)
    }

    // check if user exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
        return c.json({ error: 'Email already registered' }, 409)
    }

    // hash password
    const hashedPassword = await hashPassword(password)

    // create user
    const users = await sql`
    INSERT INTO users (id, email, password, name, plan, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${email}, ${hashedPassword}, ${name}, 'FREE', NOW(), NOW())
    RETURNING id, email, name
  `

    return c.json({
        message: 'Account created successfully',
        user: users[0]
    }, 201)
})

auth.post('/login', async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const { email, password } = await c.req.json()

    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400)
    }

    // find user
    const users = await sql`SELECT * FROM users WHERE email = ${email}`
    if (users.length === 0) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    const user = users[0]

    // verify password
    const valid = await verifyPassword(password, user.password)
    if (!valid) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // create access token (15 mins)
    const accessToken = await new SignJWT({ userId: user.id, email: user.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('15m')
        .sign(new TextEncoder().encode(c.env.JWT_ACCESS_SECRET))

    // create refresh token (7 days)
    const refreshToken = await new SignJWT({ userId: user.id })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(c.env.JWT_REFRESH_SECRET))

    // save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await sql`
    INSERT INTO refresh_tokens (id, token, "userId", "expiresAt", "createdAt")
    VALUES (gen_random_uuid(), ${refreshToken}, ${user.id}, ${expiresAt.toISOString()}, NOW())
  `

    return c.json({
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, plan: user.plan }
    })
})


auth.post("/refresh", async (c) => {
  const sql = createDb(c.env.DATABASE_URL)
  const { refreshToken } = await c.req.json()

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400)
  }

  // verify the token signature
  let payload: any
  try {
    const result = await jwtVerify(
      refreshToken,
      new TextEncoder().encode(c.env.JWT_REFRESH_SECRET)
    )
    payload = result.payload
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401)
  }

  // check if token exists in DB
  const rows = await sql`SELECT * FROM refresh_tokens WHERE token = ${refreshToken}`
  if (rows.length === 0) {
    return c.json({ error: 'Token not found' }, 401)
  }

  const dbToken = rows[0]

  // check if expired
  if (dbToken.expiresAt < new Date()) {
    return c.json({ error: 'Token expired' }, 401)
  }

  // generate new access token
  const accessToken = await new SignJWT({ userId: payload.userId, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(c.env.JWT_ACCESS_SECRET))

  return c.json({ accessToken })
})

auth.post("/logout", async (c) => {
  const sql = createDb(c.env.DATABASE_URL)
  const { refreshToken } = await c.req.json()

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400)
  }

  await sql`DELETE FROM refresh_tokens WHERE token = ${refreshToken}`

  return c.json({ message: 'Logged out successfully' })
})


export default auth