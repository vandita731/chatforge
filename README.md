# ChatForge

**Turn AI conversations into assets.**

ChatForge compresses any AI chat into a resume prompt, a clean summary, and ready-to-publish content — a LinkedIn post, a blog draft, or an action item list. Built solo as a full-stack project combining React, Hono, Python/FastAPI, and a multi-service Cloudflare Workers architecture.

🔗 **Live app:**  https://9f92a90c.chatforge.pages.dev
[vanditaj008@gmail.com](mailto:vanditaj008@gmail.com)

---

## Why I built this

AI conversations are full of decisions, code, and context — and most of it gets lost the moment you close the tab or hit a context limit. ChatForge solves that by turning any pasted conversation into a structured, reusable asset.

---

## Features

### 🗜️ Chat Compressor
Paste any AI conversation and get:
- **Token health check** — estimated token count and context window usage
- **Resume prompt** — a structured prompt to continue the same conversation in a new AI window, auto-scored for quality (1–10) and auto-improved if it scores low
- **Smart extraction** — decisions made, action items, open questions, and code snippets pulled out automatically

### ✍️ Prompt Studio
- Build and save reusable prompts, organized by category and tags
- **Generate from an idea** — describe what you want in plain English (or speak it, in English or Hindi via the Web Speech API) and AI writes a structured prompt for you
- **Guided refinement** — AI suggests specific, concrete improvements as checkable points; select the ones you like and regenerate with just those changes incorporated

### 📤 Content Exporter
From the same compressed chat, generate:
- A LinkedIn post
- A blog draft
- A clean, numbered action item list

### 🔗 Cross-Product Blog Publishing
ChatForge connects directly to my separately-built blogging platform and publishes generated blog content with one click — a real integration between two independently deployed full-stack projects, including a Worker-to-Worker service binding to route around Cloudflare's cross-zone fetch restrictions.

### 🌐 Public Share Links
Any compressed session can be shared via a public link — no login required for the viewer.

---

## Architecture

```
                  ┌─────────────────────┐
                  │      Frontend       │
                  │   React + Vite +    │
                  │      Tailwind       │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │    Hono Backend     │
                  │  Cloudflare Workers │
                  │   + Neon Postgres   │
                  └──────────┬──────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   ┌──────────────────────┐     ┌──────────────────────┐
   │  Python AI Service   │     │    Blog Backend      │
   │  FastAPI + Gemini    │     │  (separate project)  │
   └──────────────────────┘     │  via Service Binding │
                                └──────────────────────┘
```

**Frontend:** React, Vite, Tailwind CSS, deployed on Cloudflare Pages
**Backend:** Hono on Cloudflare Workers, Prisma (schema/migrations) + raw SQL via `@neondatabase/serverless`, JWT auth with access/refresh tokens
**Database:** Neon (serverless Postgres)
**AI Service:** Python, FastAPI, Google Gemini API, deployed on Render
**Cross-service communication:** Cloudflare Worker-to-Worker service bindings (avoids the `1042` same-zone fetch restriction that public `fetch()` calls hit)

---

## Technical highlights

- **Two-pass quality control on AI output** — the resume prompt is generated, then independently scored against a strict rubric, then auto-rewritten if it falls short. This catches and fixes vague AI output before the user ever sees it.
- **Service binding integration** — discovered and resolved a Cloudflare-specific networking restriction (error 1042) when one Worker called another under the same account, by switching from public URL `fetch()` to a proper `Fetcher` service binding.
- **Voice input** — Web Speech API integration supporting both English and Hindi, with zero backend cost.
- **Cost-aware AI usage** — merged what were originally two separate Gemini calls into one, added input truncation, and skip non-critical scoring calls on long inputs to stay under Cloudflare Workers' execution time limits.
- **Resilient long-request handling** — `AbortController`-based timeouts on every AI-dependent route, with graceful fallback responses instead of hard failures.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Hono, Cloudflare Workers, Prisma, Neon Postgres |
| AI Service | Python, FastAPI, Google Gemini |
| Auth | JWT (access + refresh tokens) |
| Voice | Web Speech API |
| Deployment | Cloudflare Pages (frontend), Cloudflare Workers (backend), Render (AI service) |

---

## Running locally

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Backend**
```bash
cd backend
npm install
npx wrangler dev
```

**AI Service**
```bash
cd ai-service
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload
```

You'll need a `.env` (AI service) and Cloudflare secrets (backend) for `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AI_SERVICE_URL`, and `GEMINI_API_KEY`.

---

## About me

I'm a 2nd-year CSE student building full-stack products to learn by shipping. ChatForge is one of several projects — see my [GitHub](#) for the rest, including the blog platform ChatForge integrates with.

- **LinkedIn:** www.linkedin.com/in/vandita-jain-825789358
- **Email:** vanditaj008@gmail.com
- **GitHub:** https://github.com/vandita731