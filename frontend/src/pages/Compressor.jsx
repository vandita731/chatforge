import { useState, useEffect } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import api from '../api/axios'

// ── small modal for first-time blog connection ──────────────────────────────

function ConnectBlogModal({ onClose, onConnected }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [connecting, setConnecting] = useState(false)
    const [error, setError] = useState('')

    async function handleConnect(e) {
        e.preventDefault()
        setConnecting(true)
        setError('')
        try {
            await api.post('/blog-publish/connect', { email, password })
            onConnected()
        } catch (err) {
            setError(err.response?.data?.error || 'Could not connect blog account')
        } finally {
            setConnecting(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
            <div style={{
                background: '#fff', borderRadius: 16, padding: '28px 28px 24px',
                width: '100%', maxWidth: 360
            }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>
                    Connect Blog Account
                </p>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 18 }}>
                    Log in to publish
                </h3>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                        <p style={{ color: '#dc2626', fontSize: 12.5 }}>{error}</p>
                    </div>
                )}

                <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Blog account email"
                        required
                        style={{
                            background: '#000', color: '#fff', fontSize: 13,
                            padding: '10px 14px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)', outline: 'none'
                        }}
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Blog account password"
                        required
                        style={{
                            background: '#000', color: '#fff', fontSize: 13,
                            padding: '10px 14px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)', outline: 'none'
                        }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button
                            type="submit"
                            disabled={connecting}
                            style={{
                                flex: 1, background: '#111827', color: '#fff', fontSize: 13,
                                fontWeight: 600, padding: '10px 0', borderRadius: 8, border: 'none',
                                cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.6 : 1
                            }}
                        >
                            {connecting ? 'Connecting…' : 'Connect'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, background: 'transparent', color: '#6b7280', fontSize: 13,
                                fontWeight: 500, padding: '10px 0', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function Compressor() {
    const [title, setTitle] = useState('')
    const [rawChat, setRawChat] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState(null)
    const [searchParams] = useSearchParams()
    const [exportLoading, setExportLoading] = useState('')
    const sessionId = searchParams.get('id')
    const [exportResult, setExportResult] = useState(null)
    const location = useLocation()

    // ── blog publish state ───────────────────────────────────────────────────
    const [blogConnected, setBlogConnected] = useState(false)
    const [showConnectModal, setShowConnectModal] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [publishedUrl, setPublishedUrl] = useState('')


    useEffect(() => {
        if (!sessionId) return
        async function loadSession() {
            setLoading(true)
            try {
                const { data } = await api.get(`/sessions/${sessionId}/outputs`)
                setResult(data)
            } catch (err) {
                console.log('ERROR:', err.response?.data || err.message)
            } finally {
                setLoading(false)
            }
        }
        loadSession()
    }, [sessionId])

    useEffect(() => {
        if (location.state?.demoChat) {
            setTitle(location.state.demoTitle || '')
            setRawChat(location.state.demoChat)
        }
    }, [location.state])

    // check blog connection status once on mount
    useEffect(() => {
        async function checkBlogConnection() {
            try {
                const { data } = await api.get('/blog-publish/connect')
                setBlogConnected(data.connected)
            } catch {
                setBlogConnected(false)
            }
        }
        checkBlogConnection()
    }, [])

    async function handleCompress(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { data } = await api.post('/sessions', { title, rawChat })
            setResult(data)
        } catch (err) {
            setError(err.response?.data?.error || 'Compression failed')
        } finally {
            setLoading(false)
        }
    }

    async function handleExport(exportType) {
        setExportLoading(exportType)
        try {
            const { data } = await api.post(`/sessions/${result.session.id}/export`, { exportType })

            setExportResult({ type: exportType, content: data.content })
        } catch {
            alert('Export failed')
        } finally {
            setExportLoading('')
        }
    }

    async function handleShare() {
        try {
            const { data } = await api.post(`/sessions/${result.session.id}/share`)

            // extract just the token from whatever URL the backend returns
            const token = data.publicURL.split('/s/')[1]
            const shareURL = `${window.location.origin}/s/${token}`

            navigator.clipboard.writeText(shareURL)
            alert('Share link copied!')
        } catch {
            alert('Share failed')
        }
    }

    // ── publish to blog ──────────────────────────────────────────────────────
    async function handlePublishToBlog() {
        if (!blogConnected) {
            setShowConnectModal(true)
            return
        }

        // need a BLOG export generated first
        if (!exportResult || exportResult.type !== 'BLOG') {
            // try generating it automatically if not already showing
            setExportLoading('BLOG')
            try {
                await api.post(`/sessions/${result.session.id}/export`, { exportType: 'BLOG' })
            } catch {
                alert('Could not generate blog content first — try clicking "Blog Post" above.')
                setExportLoading('')
                return
            }
            setExportLoading('')
        }

        setPublishing(true)
        setPublishedUrl('')
        try {
            const { data } = await api.post(`/blog-publish/${result.session.id}/publish`)
            setPublishedUrl(data.postUrl)
        } catch (err) {
            const code = err.response?.data?.error
            if (code === 'NO_BLOG_CONNECTED') {
                setShowConnectModal(true)
            } else if (code === 'BLOG_SESSION_EXPIRED') {
                setBlogConnected(false)
                setShowConnectModal(true)
            } else if (code === 'NO_BLOG_EXPORT') {
                alert('Generate the Blog Post export first, then publish.')
            } else {
                alert('Publish failed — please try again.')
            }
        } finally {
            setPublishing(false)
        }
    }

    function handleBlogConnected() {
        setBlogConnected(true)
        setShowConnectModal(false)
        // automatically retry publish right after connecting
        handlePublishToBlog()
    }

    function copy(text) {
        navigator.clipboard.writeText(text)
        alert('Copied!')
    }

    return (
        <div className="min-h-screen bg-[#f0ede6] text-black"
            style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }}
        >
            {loading && (
                <div className="fixed inset-0 bg-[#f0ede6]/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-black/40 text-sm">Analyzing your chat...</p>
                        <p className="text-black/25 text-xs mt-2">This may take up to 30 seconds</p>
                    </div>
                </div>
            )}

            {showConnectModal && (
                <ConnectBlogModal
                    onClose={() => setShowConnectModal(false)}
                    onConnected={handleBlogConnected}
                />
            )}

            {/* navbar */}
            <nav className="border-b border-black/10 px-8 py-4 flex items-center justify-between sticky top-0 bg-[#f0ede6]/90 backdrop-blur-sm z-10">
                <Link to="/" className="font-semibold text-black tracking-tight">ChatForge</Link>
                <Link to="/dashboard" className="text-black/40 hover:text-black text-sm transition">
                    ← Dashboard
                </Link>
            </nav>

            <div className="max-w-3xl mx-auto px-6 py-12">

                {/* header */}
                <p className="text-black/30 text-xs uppercase tracking-widest mb-2">Compressor</p>
                <h1 className="text-3xl font-semibold text-black mb-2">Compress a Chat</h1>
                <p className="text-black/40 text-sm mb-10">
                    Paste any AI conversation — get a health check, resume prompt, and smart extractions.
                </p>

                {/* form */}
                <form onSubmit={handleCompress} className="space-y-4 mb-12">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Session title (optional)"
                        className="w-full bg-black text-white text-sm px-4 py-3 rounded-lg border border-black/10 focus:outline-none focus:border-white/30 placeholder-white/20 transition font-mono"

                    />
                    <textarea
                        value={rawChat}
                        onChange={(e) => setRawChat(e.target.value)}
                        placeholder="Paste your AI conversation here..."
                        rows={10}
                        required
                        className="w-full bg-black text-white text-sm px-4 py-3 rounded-lg border border-black/10 focus:outline-none focus:border-white/30 placeholder-white/20 transition font-mono"
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white text-sm font-medium px-6 py-3 rounded-lg hover:bg-black/80 transition disabled:opacity-40"
                    >
                        {loading ? 'Analyzing...' : 'Compress Chat →'}
                    </button>
                </form>

                {/* results */}
                {result && (
                    <div className="space-y-4">
                        <div className="border-t border-black/10 pt-8 mb-6">
                            <p className="text-black/30 text-xs uppercase tracking-widest">Results</p>
                        </div>

                        {/* health */}
                        <div className="bg-white/60 border border-black/8 rounded-xl p-6">
                            <p className="text-xs uppercase tracking-widest text-black/30 mb-4">Token Health</p>
                            <div className="flex items-center gap-4">
                                <span className="text-4xl font-semibold">{result.analysis.healthScore}%</span>
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${result.analysis.healthStatus === 'healthy' ? 'bg-green-100 text-green-700' :
                                    result.analysis.healthStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {result.analysis.healthStatus}
                                </span>
                                <span className="text-black/30 text-sm">{result.session.tokenCount} tokens</span>
                            </div>
                        </div>

                        {/* summary */}
                        <div className="bg-white/60 border border-black/8 rounded-xl p-6">
                            <p className="text-xs uppercase tracking-widest text-black/30 mb-3">Summary</p>
                            <p className="text-black/70 text-sm leading-relaxed">{result.analysis.summary}</p>
                        </div>

                        {/* resume prompt */}
                        <div className="bg-white/60 border border-black/8 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs uppercase tracking-widest text-black/30">Resume Prompt</p>
                                <button
                                    onClick={() => copy(result.analysis.resumePrompt)}
                                    className="text-xs text-black/30 hover:text-black border border-black/10 px-3 py-1 rounded-lg transition"
                                >
                                    Copy
                                </button>
                            </div>
                            <p className="text-black/70 text-sm leading-relaxed whitespace-pre-wrap">
                                {result.analysis.resumePrompt}
                            </p>
                            {result.analysis.promptScore !== null ? (
                                <p className="text-xs text-black/20 mt-3">
                                    Quality score: {result.analysis.promptScore}/10
                                </p>
                            ) : (
                                <p className="text-xs text-black/20 mt-3">
                                    Quality score: Skipped for long chats
                                </p>
                            )}
                        </div>

                        {/* decisions */}
                        {result.analysis.decisions?.length > 0 && (
                            <div className="bg-white/60 border border-black/8 rounded-xl p-6">
                                <p className="text-xs uppercase tracking-widest text-black/30 mb-3">Decisions</p>
                                <ul className="space-y-2">
                                    {result.analysis.decisions.map((d, i) => (
                                        <li key={i} className="text-black/60 text-sm flex gap-2">
                                            <span className="text-black/20">—</span>{d}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* action items */}
                        {result.analysis.actionItems?.length > 0 && (
                            <div className="bg-white/60 border border-black/8 rounded-xl p-6">
                                <p className="text-xs uppercase tracking-widest text-black/30 mb-3">Action Items</p>
                                <ul className="space-y-2">
                                    {result.analysis.actionItems.map((item, i) => (
                                        <li key={i} className="text-black/60 text-sm flex gap-2">
                                            <span className="text-black/20">{i + 1}.</span>{item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* open questions */}
                        {result.analysis.openQuestions?.length > 0 && (
                            <div className="bg-white/60 border border-black/8 rounded-xl p-6">
                                <p className="text-xs uppercase tracking-widest text-black/30 mb-3">Open Questions</p>
                                <ul className="space-y-2">
                                    {result.analysis.openQuestions.map((q, i) => (
                                        <li key={i} className="text-black/60 text-sm flex gap-2">
                                            <span className="text-black/20">?</span>{q}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* export and share */}
                        <div className="bg-white/60 border border-black/8 rounded-xl p-6">
                            <p className="text-xs uppercase tracking-widest text-black/30 mb-4">Export & Share</p>

                            {/* buttons row */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleExport('BLOG')}
                                    disabled={exportLoading === 'BLOG'}
                                    className="text-sm px-4 py-2 h-9 rounded-lg border border-black/10 text-black/60 hover:bg-black hover:text-white transition disabled:opacity-40"
                                >
                                    {exportLoading === 'BLOG' ? 'Generating...' : 'Blog Post'}
                                </button>
                                <button
                                    onClick={() => handleExport('LINKEDIN')}
                                    disabled={exportLoading === 'LINKEDIN'}
                                    className="text-sm px-4 py-2 h-9 rounded-lg border border-black/10 text-black/60 hover:bg-black hover:text-white transition disabled:opacity-40"
                                >
                                    {exportLoading === 'LINKEDIN' ? 'Generating...' : 'LinkedIn'}
                                </button>
                                <button
                                    onClick={() => handleExport('ACTION_ITEMS')}
                                    disabled={exportLoading === 'ACTION_ITEMS'}
                                    className="text-sm px-4 py-2 h-9 rounded-lg border border-black/10 text-black/60 hover:bg-black hover:text-white transition disabled:opacity-40"
                                >
                                    {exportLoading === 'ACTION_ITEMS' ? 'Generating...' : 'Action Items'}
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="text-sm px-4 py-2 h-9 rounded-lg bg-black text-white hover:bg-black/80 transition"
                                >
                                    Share Link
                                </button>
                                <button
                                    onClick={handlePublishToBlog}
                                    disabled={publishing}
                                    className="text-sm px-4 py-2 h-9 rounded-lg bg-violet-700 text-white hover:bg-violet-800 transition disabled:opacity-40 flex items-center gap-1.5"
                                >
                                    {publishing
                                        ? 'Publishing…'
                                        : blogConnected
                                            ? '✦ Publish to Blog'
                                            : 'Connect & Publish'}
                                </button>
                            </div>

                            {/* published confirmation */}
                            {publishedUrl && (
                                <div className="mt-4 bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 flex items-center justify-between">
                                    <p className="text-violet-700 text-sm">Published successfully!</p>
                                    <a
                                        href={publishedUrl.split('/blog/')[0]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-violet-700 text-sm font-medium underline"
                                    >
                                        View on blog →
                                    </a>
                                </div>
                            )}

                            {/* export result — full width below buttons */}
                            {exportResult && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs uppercase tracking-widest text-black/30">
                                            {exportResult.type === 'BLOG' ? 'Blog Post' :
                                                exportResult.type === 'LINKEDIN' ? 'LinkedIn Post' : 'Action Items'}
                                        </p>
                                        <button
                                            onClick={() => setExportResult(null)}
                                            className="text-xs text-black/30 hover:text-black transition"
                                        >
                                            Close ✕
                                        </button>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={exportResult.content}
                                        rows={14}
                                        className="w-full bg-black text-white text-sm px-4 py-3 rounded-lg border border-black/10 resize-none focus:outline-none font-mono"
                                    />
                                    <p className="text-xs text-black/25 mt-2">Select all and copy (Ctrl+A, Ctrl+C)</p>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    )
}