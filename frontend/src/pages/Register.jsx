import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'
import { TrendingUp } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = k => e => setForm({ ...form, [k]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.user)
      // Small delay to let context and localStorage sync
      await new Promise(resolve => setTimeout(resolve, 100))
      navigate('/dashboard')
    } catch (e) {
      setErr(e.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg,#10B981,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 0.75rem', boxShadow: '0 0 25px rgba(16,185,129,0.25)'
          }}>
            <TrendingUp size={22} color="#000" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Create Account</h1>
        </div>

        <div className="card fade-up" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { key: 'full_name', label: 'Full Name', placeholder: 'Arjun Sharma', type: 'text' },
              { key: 'email',     label: 'Email',     placeholder: 'you@example.com', type: 'email' },
              { key: 'password',  label: 'Password',  placeholder: '••••••••', type: 'password' },
              { key: 'phone',     label: 'Phone',     placeholder: '9876543210', type: 'tel' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
                <input className="input" type={type} placeholder={placeholder}
                  value={form[key]} onChange={set(key)}
                  required={key !== 'phone'} />
              </div>
            ))}

            {err && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: '#EF4444'
              }}>{err}</div>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)', marginTop: '1.25rem' }}>
            Have an account?{' '}
            <Link to="/login" style={{ color: '#10B981', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
