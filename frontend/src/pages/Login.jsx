import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'
import { Eye, EyeOff, TrendingUp } from 'lucide-react'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      // Small delay to let context and localStorage sync
      await new Promise(resolve => setTimeout(resolve, 100))
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/dashboard')
    } catch (e) {
      setErr(e.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        top: '10%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', boxShadow: '0 0 30px rgba(16,185,129,0.3)'
          }}>
            <TrendingUp size={26} color="#000" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>FinTrack</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.3rem' }}>
            Secure personal finance platform
          </p>
        </div>

        <div className="card fade-up" style={{ padding: '2rem' }}>
          <h2 style={{ fontWeight: 600, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Sign in</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  style={{ paddingRight: '2.5rem' }}
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)'
                }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {err && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: '#EF4444'
              }}>{err}</div>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)', marginTop: '1.25rem' }}>
            No account?{' '}
            <Link to="/register" style={{ color: '#10B981', textDecoration: 'none', fontWeight: 500 }}>
              Create one
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--muted)', marginTop: '1.5rem' }}>
          Demo — admin@fintrack.com / password123
        </p>
      </div>
    </div>
  )
}
