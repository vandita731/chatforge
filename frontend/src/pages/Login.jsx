import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import api from '../api/axios'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()   // ← add this line

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      // ← changed: if we arrived here carrying demo data, go to compressor with it
      if (location.state?.demoChat) {
        navigate('/compress', { state: location.state })
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}
    >
      <div className="w-full max-w-sm px-6 relative z-10">

        {/* logo */}
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white/60" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-white text-center mb-1">
          Welcome back
        </h1>
        <p className="text-white/30 text-sm text-center mb-8">
          First time here?{' '}
          <Link to="/register" className="text-white/60 hover:text-white transition">
            Sign up for free
          </Link>
        </p>

        {error && (
          <div className="border border-red-500/20 bg-red-500/5 text-red-400 text-sm px-4 py-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            required
            className="w-full bg-white/5 text-white text-sm px-4 py-3 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 placeholder-white/20 transition"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full bg-white/5 text-white text-sm px-4 py-3 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 placeholder-white/20 transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black text-sm font-medium py-3 rounded-lg hover:bg-white/90 transition disabled:opacity-40"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

      </div>
    </div>
  )
}