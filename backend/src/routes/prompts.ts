import { Hono } from "hono"
import { createDb } from '../lib/prisma'
import { authMiddleware } from "../middleware/auth"

type Bindings = {
    DATABASE_URL: string
    JWT_ACCESS_SECRET: string
    JWT_REFRESH_SECRET: string
    AI_SERVICE_URL:string
}

type Variables = {
    userId: string
}

const prom = new Hono<{ Bindings: Bindings, Variables: Variables }>()



prom.get("/",authMiddleware,async(c)=>{
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get("userId")
    const rows = await sql`SELECT * FROM prompts WHERE "userId" = ${userId} ORDER BY "createdAt" DESC`
    return c.json({rows},200)
})
prom.get("/:id",authMiddleware,async(c)=>{
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get("userId")
    const id = c.req.param('id')
    const rows = await sql`SELECT * FROM prompts WHERE "userId"= ${userId} AND "id"=${id} `
    if(rows.length ===0){
        return c.json({error:'no prompt found'},404)
    }
    return c.json({prompt : rows[0]},200)
})

prom.delete("/:id",authMiddleware,async(c)=>{
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get("userId")
    const id = c.req.param('id')
    const rows = await sql`DELETE FROM prompts WHERE "id"=${id}  AND "userId" = ${userId} `
    return c.json({message :"deleted successfully"},200)
})
prom.put("/:id",authMiddleware,async(c)=>{
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get("userId")
    const {title,body,category,tags} = await c.req.json()
    const id = c.req.param('id')
    // SQL hint
await sql`
  UPDATE prompts 
  SET title = ${title}, body = ${body}, category = ${category}, "updatedAt" = NOW()
  WHERE id = ${id} AND "userId" = ${userId}
  RETURNING *
`
    return c.json({message :"updated successfully"},200)
})

prom.post('/generate', authMiddleware, async (c) => {
  const { idea, category } = await c.req.json()

  const response = await fetch(
    `${c.env.AI_SERVICE_URL}/generate-prompt`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idea,
        category
      })
    }
  )

  const data = await response.json() as any
  return c.json({ prompt: data.prompt, suggestions: data.suggestions })
})

prom.post('/regenerate', authMiddleware, async (c) => {
    const { idea, category, currentPrompt, selectedSuggestions } = await c.req.json()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
        const aiResponse = await fetch(`${c.env.AI_SERVICE_URL}/regenerate-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea, category, currentPrompt, selectedSuggestions }),
            signal: controller.signal
        })
        clearTimeout(timeoutId)
        const data = await aiResponse.json() as any
        return c.json({ prompt: data.prompt })
    } catch (e) {
        clearTimeout(timeoutId)
        return c.json({ error: 'Regenerate failed, try again' }, 500)
    }
})


prom.post("/", authMiddleware, async (c) => {
  try {
    const sql = createDb(c.env.DATABASE_URL)
    const userId = c.get("userId")

    const data = await c.req.json()

    console.log("SAVE REQUEST:", data)

    const { title, body, category, tags } = data

    const rows = await sql`
      INSERT INTO prompts (
        id,
        "userId",
        title,
        body,
        category,
        tags,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        ${userId},
        ${title},
        ${body},
        ${category},
        ARRAY[]::text[],
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return c.json({ rows })
  } catch (err) {
    console.error("PROMPT SAVE ERROR:", err)
    return c.json({ error: String(err) }, 500)
  }
})
export default prom