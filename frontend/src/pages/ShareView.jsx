import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'


// ── helpers ──────────────────────────────────────────────────────────────────

function parseOutput(outputs, type) {
  const found = outputs?.find(o => o.type === type)
  if (!found) return null
  try { return JSON.parse(found.content) } catch { return found.content }
}

function HealthBadge({ score, status }) {
  const colors = {
    healthy:  { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
    warning:  { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    critical: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  }
  const c = colors[status] || colors.healthy
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: c.bg, color: c.text,
      padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 500
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {status} · {score}%
    </span>
  )
}

function PromptScoreBadge({ score }) {
  if (score == null) return null
  const color = score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      border: `1.5px solid ${color}`, color, borderRadius: 20,
      padding: '3px 10px', fontSize: 13, fontWeight: 600
    }}>
      Prompt quality {score}/10
    </span>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 12, padding: '20px 24px', ...style
    }}>
      {children}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} style={{
      fontSize: 12, padding: '5px 12px', borderRadius: 6,
      border: '1px solid #d1d5db', background: copied ? '#f0fdf4' : '#f9fafb',
      color: copied ? '#15803d' : '#374151', cursor: 'pointer', fontWeight: 500,
      transition: 'all 0.15s'
    }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function TagList({ items, emptyText }) {
  if (!items?.length) return <p style={{ color: '#9ca3af', fontSize: 14 }}>{emptyText}</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>—</span>
          <span style={{ fontSize: 14, color: '#111827', lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function ShareView() {
  const { token } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    async function fetchShare() {
      try {
        const res = await fetch(`https://chatforge-backend.vanditaj008.workers.dev/s/${token}`)
const resData = await res.json()
if (!res.ok) throw new Error(resData.error || 'Not found')
setData(resData)                        // fixed: res.data not {value}
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load shared session.')
      } finally {
        setLoading(false)
      }
    }
    fetchShare()                                    // fixed: actually call the function
  }, [token])

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0ede6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36, height: 36, border: '3px solid #e5e7eb',
          borderTopColor: '#111827', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
        }} />
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading shared session…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  // ── error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔗</p>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Link not found</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>{error}</p>
        <Link to="/compress" style={{
          background: '#111827', color: '#fff', padding: '10px 20px',
          borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500
        }}>
          Compress your own chat →
        </Link>
      </div>
    </div>
  )

  // ── parse outputs ──────────────────────────────────────────────────────────
  const { session, outputs } = data
  const summary      = parseOutput(outputs, 'SUMMARY')
  const resumePrompt = parseOutput(outputs, 'RESUME_PROMPT')
  const decisions    = parseOutput(outputs, 'DECISIONS')
  const actionItems  = parseOutput(outputs, 'ACTION_ITEMS')
  const openQs       = parseOutput(outputs, 'OPEN_QUESTIONS')
  const health       = parseOutput(outputs, 'HEALTH')

  const healthScore  = health?.healthScore ?? 0
  const healthStatus = health?.healthStatus ?? 'healthy'
  const promptScore  = health?.promptScore ?? null

  // ── view ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f0ede6', fontFamily: 'system-ui, sans-serif' }}>

      {/* nav */}
      <div style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontWeight: 700, fontSize: 16, color: '#111827', textDecoration: 'none' }}>ChatForge</Link>
          <Link to="/compress" style={{
            fontSize: 13, color: '#374151', textDecoration: 'none',
            border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: 7,
            fontWeight: 500, background: '#fff'
          }}>
            Compress your own →
          </Link>
        </div>
      </div>

      {/* body */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>
            Shared Session
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
            {session?.title || 'Untitled Chat'}
          </h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <HealthBadge score={healthScore} status={healthStatus} />
            <PromptScoreBadge score={promptScore} />
            <span style={{ fontSize: 13, color: '#9ca3af' }}>
              {session?.tokenCount?.toLocaleString()} tokens
            </span>
          </div>
        </div>

        {/* summary */}
        {summary && (
          <Section label="Summary">
            <Card>
              <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: 0 }}>{summary}</p>
            </Card>
          </Section>
        )}

        {/* resume prompt */}
        {resumePrompt && (
          <Section label="Resume Prompt">
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  Paste this into a new AI window to continue exactly where this chat left off.
                </p>
                <CopyButton text={resumePrompt} />
              </div>
              <pre style={{
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 8, padding: '14px 16px', fontSize: 13,
                color: '#111827', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                lineHeight: 1.65, margin: 0, fontFamily: 'ui-monospace, monospace'
              }}>
                {resumePrompt}
              </pre>
            </Card>
          </Section>
        )}

        {/* two column — decisions + action items */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>
              Decisions
            </p>
            <Card style={{ height: '100%' }}>
              <TagList items={decisions} emptyText="No decisions recorded." />
            </Card>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>
              Action Items
            </p>
            <Card style={{ height: '100%' }}>
              <TagList items={actionItems} emptyText="No action items found." />
            </Card>
          </div>
        </div>

        {/* open questions */}
        {openQs?.length > 0 && (
          <Section label="Open Questions">
            <Card>
              <TagList items={openQs} emptyText="No open questions." />
            </Card>
          </Section>
        )}

        {/* cta */}
        <div style={{ marginTop: 48, padding: '28px 32px', background: '#111827', borderRadius: 14, textAlign: 'center' }}>
          <p style={{ color: '#f9fafb', fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
            Never lose a valuable AI conversation again.
          </p>
          <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>
            ChatForge compresses your chats into resume prompts, summaries, and action items.
          </p>
          <Link to="/compress" style={{
            background: '#fff', color: '#111827', padding: '10px 24px',
            borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600
          }}>
            Try it free →
          </Link>
        </div>

      </div>
    </div>
  )
}