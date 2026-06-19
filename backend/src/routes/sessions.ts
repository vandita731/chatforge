import { Hono } from "hono"
import { createDb } from '../lib/prisma'
import { authMiddleware } from "../middleware/auth"

type Bindings = {
    DATABASE_URL: string
    JWT_ACCESS_SECRET: string
    JWT_REFRESH_SECRET: string
    AI_SERVICE_URL: string
}

type Variables = {
    userId: string
}

const sess = new Hono<{ Bindings: Bindings, Variables: Variables }>()

sess.post("/", authMiddleware, async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const { title, rawChat } = await c.req.json()

    if (!rawChat) {
        return c.json({ error: 'Raw chat is required' }, 400)
    }

    const userId = c.get('userId')

    const rows = await sql`
    INSERT INTO sessions (id, "userId", title, "rawChat", "tokenCount", "isPublic", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${userId}, ${title}, ${rawChat}, 0, false, NOW(), NOW())
    RETURNING *
  `
    const session = rows[0]

    const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 25000) // 25s, under Workers' 30s limit

try {
  const aiResponse = await fetch(`${c.env.AI_SERVICE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawChat }),
    signal: controller.signal
  })
  clearTimeout(timeoutId)
  const analysis = await aiResponse.json() as any
  // ... rest of your code
} catch (e) {
  clearTimeout(timeoutId)
  console.error('AI service failed:', e)
  return c.json({
    session: { id: session.id, userId: session.userId, title: session.title, tokenCount: 0, createdAt: session.createdAt },
    analysis: null,
    error: 'Chat too long or AI service timed out. Try a shorter chat.'
  }, 201)
}
})
sess.get("/", authMiddleware, async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get('userId')
    const sessions = await sql`SELECT * FROM sessions WHERE "userId" = ${userId} ORDER BY "createdAt" DESC`
    return c.json({ sessions }, 200)
})


sess.get("/:id", authMiddleware, async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get('userId')
    const id = c.req.param('id')
    const rows = await sql`SELECT * FROM sessions WHERE id = ${id} AND "userId" = ${userId}`
    if (rows.length === 0) {
        return c.json({ error: 'Session not found' }, 404)
    }

    const outputs = await sql`SELECT * FROM outputs WHERE "sessionId" = ${id}`
    const analysis: any = {}
    outputs.forEach((o: any) => {
        if (o.type === 'RESUME_PROMPT') analysis.resumePrompt = o.content
        if (o.type === 'ACTION_ITEMS') analysis.actionItems = JSON.parse(o.content)
        if (o.type === 'OPEN_QUESTIONS') analysis.openQuestions = JSON.parse(o.content)
        if (o.type === 'DECISIONS') analysis.decisions = JSON.parse(o.content)
        if (o.type === 'SUMMARY') analysis.summary = o.content
        if (o.type === 'HEALTH') {
            const health = JSON.parse(o.content)
            analysis.healthScore = health.healthScore
            analysis.healthStatus = health.healthStatus
            analysis.promptScore = health.promptScore
        }
    })

    return c.json({ session: rows[0], analysis }, 200)
})

sess.post('/:id/export', authMiddleware, async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get('userId')
    const id = c.req.param('id')
    const { exportType } = await c.req.json()

    if (!exportType) {
        return c.json({ error: 'exportType is required' }, 400)
    }

    const rows = await sql`SELECT * FROM sessions WHERE id = ${id} AND "userId" = ${userId}`
    if (rows.length === 0) {
        return c.json({ error: 'Session not found' }, 404)
    }

    const session = rows[0]

    try {
        const aiResponse = await fetch(`${c.env.AI_SERVICE_URL}/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawChat: session.rawChat, exportType })
        })
        const result = await aiResponse.json() as any

        await sql`
      INSERT INTO outputs (id, "sessionId", type, content, "createdAt")
      VALUES (gen_random_uuid(), ${session.id}, ${exportType}, ${result.content}, NOW())
    `

        return c.json({
            exportType,
            content: result.content
        }, 201)

    } catch (e) {
        console.error('Export failed:', e)
        return c.json({ error: 'Export failed' }, 500)
    }
})

sess.post('/:id/share', authMiddleware, async (c) => {
    const sql = createDb(c.env.DATABASE_URL)
    const id = c.req.param('id')
    const userId = c.get('userId')
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    await sql`UPDATE sessions SET "publicToken"=${token} , "isPublic"=true WHERE "userId"=${userId}
    AND  "id"=${id}`
    return c.json({
        publicToken: token,
        publicURL: `http://localhost:8787/s/${token}`
    })
    
})

sess.get('/:id/outputs', authMiddleware, async (c) => {
  const sql = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const id = c.req.param('id')

  const rows = await sql`SELECT * FROM sessions WHERE id = ${id} AND "userId" = ${userId}`
  if (rows.length === 0) {
    return c.json({ error: 'Session not found' }, 404)
  }

  const outputs = await sql`SELECT * FROM outputs WHERE "sessionId" = ${id}`
  
  // convert outputs array into analysis object
  const analysis: any = {}
  outputs.forEach((o: any) => {
  if (o.type === 'RESUME_PROMPT') analysis.resumePrompt = o.content
  if (o.type === 'ACTION_ITEMS') analysis.actionItems = JSON.parse(o.content)
  if (o.type === 'OPEN_QUESTIONS') analysis.openQuestions = JSON.parse(o.content)
  if (o.type === 'DECISIONS') analysis.decisions = JSON.parse(o.content)
  if (o.type === 'SUMMARY') analysis.summary = o.content
  if (o.type === 'HEALTH') {
    const health = JSON.parse(o.content)
    analysis.healthScore = health.healthScore
    analysis.healthStatus = health.healthStatus
    analysis.promptScore = health.promptScore
  }
})

  return c.json({
    session: rows[0],
    analysis
  })
})

sess.post('/:id/retry', authMiddleware, async (c) => {
  const sql = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const id = c.req.param('id')

  const rows = await sql`SELECT * FROM sessions WHERE id = ${id} AND "userId" = ${userId}`
  if (rows.length === 0) {
    return c.json({ error: 'Session not found' }, 404)
  }
  const session = rows[0]

  // truncate more aggressively on retry since first attempt already timed out
  const truncatedChat = session.rawChat.length > 4000 
    ? session.rawChat.slice(0, 4000) + '\n\n[Chat truncated for analysis]'
    : session.rawChat

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)

  try {
    const aiResponse = await fetch(`${c.env.AI_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawChat: truncatedChat }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    const analysis = await aiResponse.json() as any

    await sql`INSERT INTO outputs (id, "sessionId", type, content, "createdAt") VALUES (gen_random_uuid(), ${session.id}, 'RESUME_PROMPT', ${analysis.resumePrompt}, NOW())`
    await sql`INSERT INTO outputs (id, "sessionId", type, content, "createdAt") VALUES (gen_random_uuid(), ${session.id}, 'ACTION_ITEMS', ${JSON.stringify(analysis.actionItems)}, NOW())`
    await sql`INSERT INTO outputs (id, "sessionId", type, content, "createdAt") VALUES (gen_random_uuid(), ${session.id}, 'OPEN_QUESTIONS', ${JSON.stringify(analysis.openQuestions)}, NOW())`
    await sql`INSERT INTO outputs (id, "sessionId", type, content, "createdAt") VALUES (gen_random_uuid(), ${session.id}, 'DECISIONS', ${JSON.stringify(analysis.decisions)}, NOW())`
    await sql`INSERT INTO outputs (id, "sessionId", type, content, "createdAt") VALUES (gen_random_uuid(), ${session.id}, 'SUMMARY', ${analysis.summary}, NOW())`
    await sql`INSERT INTO outputs (id, "sessionId", type, content, "createdAt") VALUES (gen_random_uuid(), ${session.id}, 'HEALTH', ${JSON.stringify({ healthScore: analysis.healthScore, healthStatus: analysis.healthStatus, promptScore: analysis.promptScore })}, NOW())`

    await sql`UPDATE sessions SET "tokenCount" = ${analysis.tokenCount} WHERE id = ${session.id}`

    return c.json({ message: 'Retry successful', analysis })
  } catch (e) {
    clearTimeout(timeoutId)
    return c.json({ error: 'Retry failed, try again' }, 500)
  }
})
export default sess

