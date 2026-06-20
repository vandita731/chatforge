import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon } from '@neondatabase/serverless'
import auth from './routes/auth'

import { authMiddleware } from './middleware/auth'
import sess from './routes/sessions'
import prom from './routes/prompts'
import blogConnect from './routes/blogConnect'   // ← add this line
import { createDb } from './lib/prisma'

type Bindings = {
  DATABASE_URL: string
  JWT_ACCESS_SECRET: string
  JWT_REFRESH_SECRET: string
  ENVIRONMENT: string
  AI_SERVICE_URL: string     // ← add this if not already there
  BLOG_API_URL: string       // ← add this
  BLOG_SITE_URL: string      // ← add this
}

type Variables = {
  userId: string
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ 
    message: 'ChatForge API is running',
    environment: c.env.ENVIRONMENT 
  })
})

// protected test route
app.get('/me', authMiddleware, (c) => {
  const userId = c.get('userId')
  return c.json({ userId })
})

app.route('/auth', auth)
app.route('/sessions', sess)
app.route('/prompts', prom)
app.route('/blog-publish', blogConnect)   // ← add this line

app.get('/s/:token' , async (c)=>{
    const sql = createDb(c.env.DATABASE_URL)
    const token = c.req.param('token')
    const row = await sql`SELECT * from sessions where "publicToken"=${token} AND "isPublic"=true`
    if(row.length ===0){
        return c.json({error:"not found"},404)

    }
    const session = row[0]
const outputs = await sql`SELECT * FROM outputs WHERE "sessionId" = ${session.id}`
return c.json({
  session: {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    tokenCount: session.tokenCount
  },
  outputs
})
    
})
export default app