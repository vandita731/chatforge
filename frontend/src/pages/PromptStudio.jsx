import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

const CATEGORIES = ['GENERAL', 'CODING', 'WRITING', 'RESEARCH', 'DESIGN', 'ANALYSIS']

const CATEGORY_COLORS = {
  GENERAL:  { bg: '#f3f4f6', text: '#374151' },
  CODING:   { bg: '#dbeafe', text: '#1e40af' },
  WRITING:  { bg: '#fce7f3', text: '#9d174d' },
  RESEARCH: { bg: '#d1fae5', text: '#065f46' },
  DESIGN:   { bg: '#ede9fe', text: '#5b21b6' },
  ANALYSIS: { bg: '#fef3c7', text: '#92400e' },
}

function CategoryBadge({ category }) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS.GENERAL
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6,
      background: c.bg, color: c.text
    }}>
      {category}
    </span>
  )
}

function Tag({ label }) {
  return (
    <span style={{
      fontSize: 12, color: '#6b7280', background: '#f9fafb',
      border: '1px solid #e5e7eb', borderRadius: 20,
      padding: '2px 10px'
    }}>
      {label}
    </span>
  )
}

function Toast({ message }) {
  if (!message) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#111827', color: '#fff', padding: '10px 20px',
      borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 100,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      {message}
    </div>
  )
}

// ── prompt card ───────────────────────────────────────────────────────────────

function PromptCard({ prompt, onDelete, onEdit, onCopy }) {
  const [expanded, setExpanded] = useState(false)
  const tags = Array.isArray(prompt.tags)
    ? prompt.tags
    : prompt.tags
      ? prompt.tags.split(',').map(t => t.trim()).filter(Boolean)
      : []

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      overflow: 'hidden', transition: 'box-shadow 0.15s'
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* header row */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
      >
        {/* expand chevron */}
        <span style={{
          marginTop: 2, fontSize: 12, color: '#9ca3af',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s', display: 'inline-block', flexShrink: 0
        }}>▶</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{prompt.title}</span>
            <CategoryBadge category={prompt.category} />
          </div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tags.map((t, i) => <Tag key={i} label={t} />)}
            </div>
          )}
        </div>

        {/* action buttons — stop propagation so they don't toggle expand */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', gap: 6, flexShrink: 0 }}
        >
          <button
            onClick={() => onCopy(prompt.body)}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 6,
              border: '1px solid #e5e7eb', background: '#f9fafb',
              color: '#374151', cursor: 'pointer', fontWeight: 500
            }}
          >
            Copy
          </button>
          <button
            onClick={() => onEdit(prompt)}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 6,
              border: '1px solid #e5e7eb', background: '#f9fafb',
              color: '#374151', cursor: 'pointer', fontWeight: 500
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(prompt.id)}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 6,
              border: '1px solid #fecaca', background: '#fff5f5',
              color: '#dc2626', cursor: 'pointer', fontWeight: 500
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 20px 20px 44px' }}>
          <pre style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 13,
            color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            lineHeight: 1.65, margin: 0,
            background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: 8, padding: '12px 14px'
          }}>
            {prompt.body}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── voice input hook ─────────────────────────────────────────────────────────

function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState('en-IN')

  const isSupported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  function start(currentLang) {
    if (!isSupported) {
      alert('Voice input is only supported in Chrome right now.')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = currentLang || lang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
    }
    recognition.start()
    window.__chatforge_recognition = recognition
  }

  function stop() {
    window.__chatforge_recognition?.stop()
    setListening(false)
  }

  function toggleLang() {
    setLang(prev => prev === 'en-IN' ? 'hi-IN' : 'en-IN')
  }

  return { listening, start, stop, lang, toggleLang, isSupported }
}

// ── form ──────────────────────────────────────────────────────────────────────

function PromptForm({ initial, onSave, onCancel, saving }) {
  const [title, setTitle]       = useState(initial?.title    || '')
  const [body, setBody]         = useState(initial?.body     || '')
  const [category, setCategory] = useState(initial?.category || 'GENERAL')
  const [tags, setTags]         = useState(initial?.tags     || '')

  const [idea, setIdea] = useState('')
  const [generating, setGenerating] = useState(false)

  const { listening, start, stop, lang, toggleLang, isSupported } = useVoiceInput(
    (transcript) => {
      setIdea(prev => prev ? `${prev} ${transcript}` : transcript)
      setBody('')
    }
  )

  async function handleGenerate() {
    console.log("Generate clicked")

    if (!idea.trim()) return

    setGenerating(true)

    try {
        const { data } = await api.post('/prompts/generate', {
            title,
            idea,
            category
        })

        console.log("Response:", data)

        setBody(data.prompt)
    } catch (err) {
        console.log("GENERATE ERROR:", err.response?.data)
        console.log(err)
        alert('Generation failed')
    } finally {
        setGenerating(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!body.trim()) {
      alert('Please generate a prompt first')
      return
    }

    onSave({
      title,
      body,
      category,
      tags: tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    })
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#000', color: '#fff', fontSize: 13,
    padding: '10px 14px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    outline: 'none', fontFamily: 'ui-monospace, monospace',
  }

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: '#9ca3af', marginBottom: 6
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>Title</label>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Senior Dev Code Reviewer"
          required style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Prompt</label>
        <div>
          <label style={labelStyle}>Your Idea</label>
          <div style={{ display: 'flex', gap: 8 }}>
              <input
                  value={idea}
                  onChange={e => {
                    setIdea(e.target.value)
                    setBody('')
                  }}
                  placeholder="e.g. help me review React code for performance issues"
                  style={{ ...inputStyle, flex: 1 }}
              />
              {isSupported && (
                <>
                  <button
                    type="button"
                    onClick={() => listening ? stop() : start(lang)}
                    title={listening ? 'Stop listening' : 'Speak your idea'}
                    style={{
                      background: listening ? '#dc2626' : '#000',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                      padding: '9px 12px', cursor: 'pointer', fontSize: 12,
                      fontWeight: 600, whiteSpace: 'nowrap',
                      animation: listening ? 'pulse 1s infinite' : 'none'
                    }}
                  >
                    {listening ? '⏹ Stop' : '🎤 Speak'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleLang}
                    title="Toggle language"
                    style={{
                      background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '9px 10px', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700, minWidth: 38
                    }}
                  >
                    {lang === 'en-IN' ? 'EN' : 'हिं'}
                  </button>
                </>
              )}
              <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !idea.trim()}
                  style={{
                      background: '#6d28d9', color: '#fff', fontSize: 13,
                      fontWeight: 500, padding: '9px 16px', borderRadius: 8,
                      border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                      opacity: generating ? 0.6 : 1, whiteSpace: 'nowrap'
                  }}
              >
                  {generating ? 'Generating…' : '✦ Generate'}
              </button>
          </div>
          {listening && (
            <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6, fontWeight: 500 }}>
              ● Listening{lang === 'hi-IN' ? ' (हिंदी)' : ' (English)'}…
            </p>
          )}
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>
              Describe what you want the prompt to do, type or speak — AI will write it for you
          </p>
          <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
        </div>
        <textarea
          value={body}
          readOnly
          placeholder="Generated prompt will appear here..."
          rows={8}
          style={{
            ...inputStyle,
            resize: 'vertical',
            lineHeight: 1.6,
            opacity: body ? 1 : 0.8,
            marginTop: 14
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Category</label>
          <select
            value={category} onChange={e => setCategory(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tags</label>
          <input
            value={tags} onChange={e => setTags(e.target.value)}
            placeholder="react, debugging, api"
            style={inputStyle}
          />
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>Comma separated</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        <button
          type="submit" disabled={saving || !body}
          style={{
            background: '#111827', color: '#fff', fontSize: 13,
            fontWeight: 500, padding: '9px 20px', borderRadius: 8,
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1
          }}
        >
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Save Prompt'}
        </button>
        {onCancel && (
          <button
            type="button" onClick={onCancel}
            style={{
              background: 'transparent', color: '#6b7280', fontSize: 13,
              fontWeight: 500, padding: '9px 20px', borderRadius: 8,
              border: '1px solid #e5e7eb', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function PromptStudio() {
  const [prompts, setPrompts]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [toast, setToast]         = useState('')
  const [editingPrompt, setEditingPrompt] = useState(null)   // null = create mode, object = edit mode
  const [showForm, setShowForm]   = useState(false)
  const [filter, setFilter]       = useState('ALL')


  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // load prompts
  useEffect(() => {
    async function fetchPrompts() {
      try {
        const { data } = await api.get('/prompts')
        setPrompts(data.rows || [])
      } catch (err) {
        console.log('ERROR:', err.response?.data || err.message)
        setError('Failed to load prompts.')
      } finally {
        setLoading(false)
      }
    }
    fetchPrompts()
  }, [])

  async function handleSave(formData) {
    setSaving(true)
    try {
      if (editingPrompt) {
        // edit
        const { data } = await api.put(`/prompts/${editingPrompt.id}`, formData)
        setPrompts(prev => prev.map(p => p.id === editingPrompt.id ? (data.prompt || data) : p))
        showToast('Prompt updated')
      } else {
        // create
        const { data } = await api.post('/prompts', formData)
        setPrompts(prev => [data.prompt || data, ...prev])
        showToast('Prompt saved')
      }
      setShowForm(false)
      setEditingPrompt(null)
    } catch (err) {
      console.log("SAVE ERROR:", err.response?.data)
      console.log(err)
      setError('Failed to save prompt.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this prompt?')) return
    try {
      await api.delete(`/prompts/${id}`)
      setPrompts(prev => prev.filter(p => p.id !== id))
      showToast('Prompt deleted')
    } catch {
      setError('Failed to delete prompt.')
    }
  }

  function handleEdit(prompt) {
    setEditingPrompt(prompt)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCopy(body) {
    navigator.clipboard.writeText(body)
    showToast('Copied to clipboard')
  }

  function handleCancel() {
    setShowForm(false)
    setEditingPrompt(null)
  }

  const filtered = filter === 'ALL'
    ? prompts
    : prompts.filter(p => p.category === filter)

  return (
    <div style={{
      minHeight: '100vh', fontFamily: 'system-ui, sans-serif',
      background: '#f0ede6',
      backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
      backgroundSize: '40px 40px'
    }}>

      {/* nav */}
      <nav style={{
        borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 32px',
        background: 'rgba(240,237,230,0.9)', backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52
      }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: 15, color: '#111827', textDecoration: 'none' }}>
          ChatForge
        </Link>
        <Link to="/" style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', marginBottom: 6 }}>
              Prompt Studio
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Your Prompts</h1>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)' }}>
              Build, save, and reuse your best prompts.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => { setEditingPrompt(null); setShowForm(true) }}
              style={{
                background: '#111827', color: '#fff', fontSize: 13,
                fontWeight: 600, padding: '9px 18px', borderRadius: 8,
                border: 'none', cursor: 'pointer'
              }}
            >
              + New Prompt
            </button>
          )}
        </div>

        {/* form panel */}
        {showForm && (
          <div style={{
            background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: 14, padding: '24px 28px', marginBottom: 32
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 20 }}>
              {editingPrompt ? 'Edit Prompt' : 'New Prompt'}
            </p>
            <PromptForm
              initial={editingPrompt}
              onSave={handleSave}
              onCancel={handleCancel}
              saving={saving}
            />
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
            <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>
          </div>
        )}

        {/* category filter */}
        {prompts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {['ALL', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 12px',
                  borderRadius: 20, border: '1px solid',
                  cursor: 'pointer', transition: 'all 0.1s',
                  borderColor: filter === cat ? '#111827' : '#e5e7eb',
                  background: filter === cat ? '#111827' : '#fff',
                  color: filter === cat ? '#fff' : '#6b7280',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* prompt list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{
              width: 28, height: 28, border: '2px solid #e5e7eb',
              borderTopColor: '#111827', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
            }} />
            <p style={{ color: '#9ca3af', fontSize: 13 }}>Loading prompts…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            border: '1px dashed #d1d5db', borderRadius: 12, background: '#fff'
          }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>✦</p>
            <p style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>
              {filter === 'ALL' ? 'No prompts yet' : `No ${filter} prompts`}
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
              {filter === 'ALL'
                ? 'Save your best prompts here to reuse them anytime.'
                : `You haven't saved any ${filter.toLowerCase()} prompts yet.`}
            </p>
            {filter === 'ALL' && (
              <button
                onClick={() => { setEditingPrompt(null); setShowForm(true) }}
                style={{
                  background: '#111827', color: '#fff', fontSize: 13,
                  fontWeight: 500, padding: '8px 18px', borderRadius: 8,
                  border: 'none', cursor: 'pointer'
                }}
              >
                Create your first prompt
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(prompt => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onCopy={handleCopy}
              />
            ))}
          </div>
        )}

      </div>

      <Toast message={toast} />
    </div>
  )
}