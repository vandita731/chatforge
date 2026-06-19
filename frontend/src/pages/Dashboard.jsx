import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'

const STATUS_DOT = {
  healthy:  '#10b981',
  warning:  '#f59e0b',
  critical: '#ef4444',
}

function SessionRow({ session, onRetry, onNavigate, retrying }) {
  const failed = session.tokenCount === 0
  const isRetrying = retrying === session.id

  return (
    <div
      onClick={() => !failed && onNavigate(session.id)}
      className={`group border rounded-xl px-6 py-4 flex items-center justify-between transition ${
        failed
          ? 'border-red-200 bg-red-50/50'
          : 'border-black/8 hover:bg-white/70 hover:border-black/15 cursor-pointer'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {!failed && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: STATUS_DOT[session.healthStatus] || '#9ca3af' }}
            />
          )}
          <p className="text-black/90 text-sm font-medium truncate">
            {session.title || 'Untitled Session'}
          </p>
          {failed && (
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold shrink-0">
              Failed
            </span>
          )}
        </div>
        <p className="text-black/25 text-xs mt-1">
          {new Date(session.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          })}
        </p>
      </div>

      {failed ? (
        <button
          onClick={async (e) => {
            e.stopPropagation()
            onRetry(session.id)
          }}
          disabled={isRetrying}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium disabled:opacity-50 shrink-0"
        >
          {isRetrying ? 'Retrying…' : 'Retry'}
        </button>
      ) : (
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-black/25 text-xs">{session.tokenCount} tokens</span>
          <span className="text-black/20 text-lg group-hover:translate-x-0.5 transition-transform">→</span>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [retrying, setRetrying] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    setLoading(true)
    try {
      const { data } = await api.get('/sessions')
      setSessions(data.sessions || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRetry(id) {
    setRetrying(id)
    try {
      await api.post(`/sessions/${id}/retry`)
      await fetchSessions()
    } catch (err) {
      alert('Retry failed again — try a shorter chat')
    } finally {
      setRetrying(null)
    }
  }

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  const failedCount = sessions.filter(s => s.tokenCount === 0).length

  return (
    <div className="min-h-screen bg-[#f0ede6] text-black"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}
    >
      {/* navbar */}
      <nav className="border-b border-black/10 px-8 py-4 flex items-center justify-between sticky top-0 bg-[#f0ede6]/90 backdrop-blur-sm z-10">
        <span className="font-semibold text-black tracking-tight text-lg">ChatForge</span>
        <div className="flex items-center gap-6">
          <Link to="/prompts" className="text-black/40 hover:text-black text-sm transition">
            Prompt Studio
          </Link>
          <button onClick={handleLogout} className="text-black/40 hover:text-black text-sm transition">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-black/30 text-xs uppercase tracking-widest mb-2">Dashboard</p>
            <h1 className="text-3xl font-semibold text-black">Your Sessions</h1>
            <p className="text-black/40 text-sm mt-2">All your compressed chats in one place</p>
          </div>
          <Link to="/compress" className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-black/80 transition shrink-0">
            + New
          </Link>
        </div>

        {/* failed sessions notice */}
        {!loading && failedCount > 0 && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-6">
            <p className="text-red-700 text-xs">
              {failedCount} session{failedCount > 1 ? 's' : ''} failed to analyze
            </p>
          </div>
        )}

        {/* sessions */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-black/5 rounded-xl px-6 py-4 h-[60px] bg-white/30 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-black/10 rounded-2xl">
            <p className="text-2xl mb-3">✦</p>
            <p className="text-black/60 text-sm font-medium mb-1">No sessions yet</p>
            <p className="text-black/30 text-xs mb-6">Paste your first AI chat to get started</p>
            <Link to="/compress" className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-black/80 transition">
              Compress your first chat
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                retrying={retrying}
                onRetry={handleRetry}
                onNavigate={(id) => navigate(`/compress?id=${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}