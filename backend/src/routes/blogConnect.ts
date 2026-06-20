import { Hono } from "hono"
import { createDb } from '../lib/prisma'
import { authMiddleware } from "../middleware/auth"

type Bindings = {
    DATABASE_URL: string
    JWT_ACCESS_SECRET: string
    JWT_REFRESH_SECRET: string
    AI_SERVICE_URL: string
    BLOG_SITE_URL: string   // e.g. https://blog-medium-ytm7.vercel.app
    BLOG_SERVICE: Fetcher   // service binding to the blog backend worker
}

type Variables = {
    userId: string
}

const blogConnect = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// ── connect blog account — logs into the blog with user's blog credentials,
//    stores the returned blog JWT against this ChatForge user ──────────────

blogConnect.post("/connect", authMiddleware, async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get('userId')
    const { email, password } = await c.req.json()

    if (!email || !password) {
        return c.json({ error: 'Email and password required' }, 400)
    }

    try {
        const res = await c.env.BLOG_SERVICE.fetch("https://internal/api/v1/user/signin", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        console.log("Blog responded with status:", res.status)

        if (!res.ok) {
            const errBody = await res.text()
            console.log("Blog error body:", errBody)
            return c.json({ error: 'Invalid blog credentials' }, 401)
        }

        const data = await res.json() as any
        const blogToken = data.jwt

        if (!blogToken) {
            return c.json({ error: 'Blog login did not return a token' }, 500)
        }

        // store/update the blog token for this user
        await sql`
            INSERT INTO blog_connections (id, "userId", "blogToken", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), ${userId}, ${blogToken}, NOW(), NOW())
            ON CONFLICT ("userId")
            DO UPDATE SET "blogToken" = ${blogToken}, "updatedAt" = NOW()
        `

        return c.json({ connected: true })
    } catch (e) {
        console.error('Blog connect failed:', e)
        return c.json({ error: 'Could not reach blog service' }, 500)
    }
})

// ── check if user already has a blog connected ──────────────────────────────

blogConnect.get("/connect", authMiddleware, async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get('userId')

    const rows = await sql`SELECT id FROM blog_connections WHERE "userId" = ${userId}`
    return c.json({ connected: rows.length > 0 })
})

// ── disconnect ────────────────────────────────────────────────────────────

blogConnect.delete("/connect", authMiddleware, async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get('userId')

    await sql`DELETE FROM blog_connections WHERE "userId" = ${userId}`
    return c.json({ disconnected: true })
})

// ── publish a session's BLOG export to the connected blog account ──────────

blogConnect.post("/:sessionId/publish", authMiddleware, async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get('userId')
    const sessionId = c.req.param('sessionId')

    // 1. get the user's blog token
    const blogRows = await sql`SELECT "blogToken" FROM blog_connections WHERE "userId" = ${userId}`
    if (blogRows.length === 0) {
        return c.json({ error: 'NO_BLOG_CONNECTED' }, 400)
    }
    const blogToken = blogRows[0].blogToken

    // 2. get the session + its BLOG export output
    const sessionRows = await sql`SELECT * FROM sessions WHERE id = ${sessionId} AND "userId" = ${userId}`
    if (sessionRows.length === 0) {
        return c.json({ error: 'Session not found' }, 404)
    }

    const outputRows = await sql`
        SELECT content FROM outputs WHERE "sessionId" = ${sessionId} AND type = 'BLOG'
        ORDER BY "createdAt" DESC LIMIT 1
    `
    if (outputRows.length === 0) {
        return c.json({ error: 'NO_BLOG_EXPORT' }, 400)
    }

    const content = outputRows[0].content
    const title = sessionRows[0].title || 'Untitled — from ChatForge'

    // 3. publish to blog
    try {
        const res = await c.env.BLOG_SERVICE.fetch("https://internal/api/v1/blog", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${blogToken}`
            },
            body: JSON.stringify({
                title,
                content
                // imageUrl omitted — it's optional on the blog side,
                // sending an empty string can fail Zod's validation if it uses .url()
            })
        })

        if (res.status === 401 || res.status === 403) {
            // blog token expired — ask user to reconnect
            await sql`DELETE FROM blog_connections WHERE "userId" = ${userId}`
            return c.json({ error: 'BLOG_SESSION_EXPIRED' }, 401)
        }

        if (!res.ok) {
            const errBody = await res.text()
            console.log("Publish error body:", errBody)
            return c.json({ error: 'Blog rejected the post' }, 500)
        }

        const data = await res.json() as any
        const postUrl = `${c.env.BLOG_SITE_URL}/blog/${data.id}`

        return c.json({ postUrl }, 200)
    } catch (e) {
        console.error('Publish failed:', e)
        return c.json({ error: 'Failed to publish' }, 500)
    }
})

export default blogConnect