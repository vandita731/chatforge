import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

// ── demo chat — visitors can try this without writing their own ──────────────

const DEMO_TITLE = 'Fixing Socket.io live chat bugs'
const DEMO_CHAT = `User: I am building a real-time chat app with Socket.io and React. Messages aren't updating live for other users.
AI: This usually happens because the socket connection isn't shared properly across components. Are you initializing the socket inside a useEffect or outside the component?
User: Inside useEffect, every time the component re-renders.
AI: That's the bug. Each re-render creates a new socket connection. Move the socket initialization outside the component, or use a singleton pattern with a separate socket.js file that exports one shared instance.
`

// ── feature card data ───────────────────────────────────────────────────────

const FEATURES = [
  {
    tag: 'COMPRESSOR',
    title: 'Never lose a chat again',
    body: "Paste any AI conversation. Get a token health check, a resume prompt to continue elsewhere, and a clean extraction of decisions, action items, and open questions.",
    color: '#111827',
  },
  {
    tag: 'PROMPT STUDIO',
    title: 'Build prompts that work',
    body: "Type an idea, or just speak it — in English or Hindi. ChatForge writes a structured, reusable prompt for you, tagged and saved for next time.",
    color: '#6d28d9',
  },
  {
    tag: 'EXPORTER',
    title: 'Turn chats into content',
    body: "The same conversation that solved your bug can become a LinkedIn post, a blog draft, or a clean action item list — one click, no rewriting.",
    color: '#b45309',
  },
]

// ── animated hero demo — chat turning into a card ──────────────────────────

function HeroDemo() {
  const [stage, setStage] = useState(0) // 0 = raw chat, 1 = transforming, 2 = card

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1400)
    const t2 = setTimeout(() => setStage(2), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'relative', width: '100%', maxWidth: 460,
      height: 280, margin: '0 auto'
    }}>
      {/* raw chat — fades out */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: stage === 0 ? 1 : 0,
        transform: stage === 0 ? 'scale(1)' : 'scale(0.96)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        background: '#000', borderRadius: 14, padding: '20px 22px',
        fontFamily: 'ui-monospace, monospace', fontSize: 12.5, color: '#d1d5db',
        lineHeight: 1.8, overflow: 'hidden'
      }}>
        <p><span style={{ color: '#6ee7b7' }}>User:</span> messages aren't updating live for other users...</p>
        <p style={{ marginTop: 8 }}><span style={{ color: '#a78bfa' }}>AI:</span> the socket connection isn't shared properly...</p>
        <p style={{ marginTop: 8 }}><span style={{ color: '#6ee7b7' }}>User:</span> fixed it! one more issue though...</p>
        <p style={{ marginTop: 8 }}><span style={{ color: '#a78bfa' }}>AI:</span> implement a heartbeat or rely on...</p>
        <p style={{ marginTop: 8, opacity: 0.4 }}>...</p>
      </div>

      {/* result card — fades in */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: stage === 2 ? 1 : 0,
        transform: stage === 2 ? 'scale(1)' : 'scale(1.04)',
        transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
        background: '#fff', borderRadius: 14, padding: '20px 22px',
        border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 12px 32px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#9ca3af' }}>HEALTHY · 12%</span>
        </div>
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 14 }}>
          Fixed Socket.io duplicate messages and live disconnect detection in a React chat app.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#6d28d9', fontSize: 12 }}>—</span>
            <span style={{ fontSize: 12.5, color: '#111827' }}>Move socket init outside useEffect</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#6d28d9', fontSize: 12 }}>—</span>
            <span style={{ fontSize: 12.5, color: '#111827' }}>Add cleanup function for listeners</span>
          </div>
        </div>
        <div style={{
          marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6',
          display: 'flex', gap: 6
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#ede9fe', color: '#5b21b6' }}>RESUME PROMPT</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#dbeafe', color: '#1e40af' }}>LINKEDIN</span>
        </div>
      </div>

      {/* center arrow during transform stage */}
      {stage === 1 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 28, color: '#6d28d9', animation: 'pulse 0.8s ease infinite'
        }}>
          ✦
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; transform: scale(0.9) } 50% { opacity: 1; transform: scale(1.1) } }`}</style>
    </div>
  )
}

// ── feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ tag, title, body, color, index }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 16, padding: '28px 26px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18, color: '#fff', fontSize: 14, fontWeight: 700
      }}>
        {index}
      </div>
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        color: color, marginBottom: 10
      }}>
        {tag}
      </p>
      <h3 style={{ fontSize: 19, fontWeight: 700, color: '#111827', marginBottom: 10, lineHeight: 1.3 }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', lineHeight: 1.65 }}>
        {body}
      </p>
    </div>
  )
}

// ── main landing page ────────────────────────────────────────────────────────

export default function Landing() {
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const navigate = useNavigate()

  function tryDemo() {
    if (isLoggedIn) {
      navigate('/compress', { state: { demoTitle: DEMO_TITLE, demoChat: DEMO_CHAT } })
    } else {
      // not logged in — send to register first, carry demo through
      navigate('/register', { state: { demoTitle: DEMO_TITLE, demoChat: DEMO_CHAT } })
    }
  }

  return (
    <div style={{
      minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#111827',
      background: '#f0ede6',
      backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
      backgroundSize: '40px 40px'
    }}>

      {/* nav */}
      <nav style={{
        borderBottom: '1px solid rgba(0,0,0,0.1)', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10, height: 64,
        background: 'rgba(240,237,230,0.9)', backdropFilter: 'blur(8px)'
      }}>
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>ChatForge</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to={isLoggedIn ? '/dashboard' : '/login'} style={{
            fontSize: 13, color: 'rgba(0,0,0,0.5)', textDecoration: 'none', fontWeight: 500
          }}>
            {isLoggedIn ? 'Dashboard' : 'Log in'}
          </Link>
          <Link to={isLoggedIn ? '/compress' : '/register'} style={{
            fontSize: 13, fontWeight: 600, color: '#fff', background: '#111827',
            padding: '8px 16px', borderRadius: 8, textDecoration: 'none'
          }}>
            {isLoggedIn ? 'Compress a chat' : 'Get started'}
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section style={{ maxWidth: 1040, margin: '0 auto', padding: '80px 24px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}
             className="hero-grid">
          <div>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#6d28d9', marginBottom: 18
            }}>
              Turn AI conversations into assets
            </p>
            <h1 style={{
              fontSize: 'clamp(32px, 5vw, 46px)', fontWeight: 700, lineHeight: 1.1,
              letterSpacing: '-0.02em', marginBottom: 20
            }}>
              Your best AI chats shouldn't disappear into a tab you'll never reopen.
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.55)', lineHeight: 1.65, marginBottom: 32, maxWidth: 440 }}>
              ChatForge compresses any AI conversation into a resume prompt, a clean summary, and content
              you can actually publish — a LinkedIn post, a blog draft, or an action item list.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to={isLoggedIn ? '/compress' : '/register'} style={{
                background: '#111827', color: '#fff', fontSize: 14, fontWeight: 600,
                padding: '13px 24px', borderRadius: 10, textDecoration: 'none'
              }}>
                {isLoggedIn ? 'Compress a chat →' : 'Start for free →'}
              </Link>
              <button onClick={tryDemo} style={{
                background: '#fff', color: '#6d28d9', fontSize: 14, fontWeight: 600,
                padding: '13px 24px', borderRadius: 10,
                border: '1px solid #e9d5ff', cursor: 'pointer'
              }}>
                ✦ Try a demo
              </button>
              <Link to={isLoggedIn ? '/dashboard' : '/login'} style={{
                background: 'transparent', color: '#111827', fontSize: 14, fontWeight: 600,
                padding: '13px 24px', borderRadius: 10, textDecoration: 'none',
                border: '1px solid rgba(0,0,0,0.15)'
              }}>
                {isLoggedIn ? 'View dashboard' : 'I have an account'}
              </Link>
            </div>
          </div>

          <HeroDemo />
        </div>
        <style>{`
          @media (max-width: 760px) {
            .hero-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* features */}
      <section style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 90px' }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'rgba(0,0,0,0.35)', marginBottom: 10, textAlign: 'center'
        }}>
          Three tools, one chat
        </p>
        <h2 style={{
          fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 48, letterSpacing: '-0.01em'
        }}>
          What you can do with ChatForge
        </h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20
        }} className="feature-grid">
          {FEATURES.map((f, i) => <FeatureCard key={f.tag} {...f} index={i + 1} />)}
        </div>
        <style>{`
          @media (max-width: 820px) {
            .feature-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* bottom CTA */}
      <section style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px 100px' }}>
        <div style={{
          background: '#111827', borderRadius: 20, padding: '52px 40px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
            Paste a chat. See what's inside it.
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginBottom: 28 }}>
            No credit card. No setup. Just your conversation.
          </p>
          <Link to={isLoggedIn ? '/compress' : '/register'} style={{
            background: '#fff', color: '#111827', fontSize: 14, fontWeight: 700,
            padding: '13px 28px', borderRadius: 10, textDecoration: 'none', display: 'inline-block'
          }}>
            {isLoggedIn ? 'Compress a chat →' : 'Try ChatForge free →'}
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer style={{
        borderTop: '1px solid rgba(0,0,0,0.08)', padding: '40px 32px 28px',
      }}>
        <div style={{
          maxWidth: 1040, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexWrap: 'wrap', gap: 24
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>ChatForge</p>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>Built by Vandita Jain · Bangalore, India</p>
          </div>

          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <a href="https://www.linkedin.com/in/YOUR-LINKEDIN-HANDLE" target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', textDecoration: 'none', fontWeight: 500 }}>
              LinkedIn
            </a>
            <a href="https://github.com/YOUR-GITHUB-HANDLE" target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', textDecoration: 'none', fontWeight: 500 }}>
              GitHub
            </a>
            <a href="mailto:vanditaj008@gmail.com"
               style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', textDecoration: 'none', fontWeight: 500 }}>
              Email
            </a>
            <a href="tel:+917999863849"
               style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', textDecoration: 'none', fontWeight: 500 }}>
              +91 79998 63849
            </a>
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer"
               style={{
                 fontSize: 13, color: '#fff', background: '#111827',
                 padding: '6px 14px', borderRadius: 7, textDecoration: 'none', fontWeight: 600
               }}>
              Resume ↓
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}