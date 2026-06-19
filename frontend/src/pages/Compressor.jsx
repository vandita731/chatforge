import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/axios'


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


    useEffect(() => {
        if (!sessionId) return
        async function loadSession() {
    setLoading(true)
    try {
        const { data } = await api.get(`/sessions/${sessionId}/outputs`)  // ← fixed endpoint
        setResult(data)
    } catch (err) {
        console.log('ERROR:', err.response?.data || err.message)
    } finally {
        setLoading(false)
    }
}
        loadSession()
    }, [sessionId])

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
            {/* navbar */}
            <nav className="border-b border-black/10 px-8 py-4 flex items-center justify-between sticky top-0 bg-[#f0ede6]/90 backdrop-blur-sm z-10">
                <Link to="/" className="font-semibold text-black tracking-tight">ChatForge</Link>
                <Link to="/" className="text-black/40 hover:text-black text-sm transition">
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
                            </div>

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