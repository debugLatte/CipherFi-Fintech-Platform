import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { User, Phone, Mail, Shield, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loginHistory, setLoginHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/auth/me'),
      api.get('/auth/login-history').catch(() => ({ data: [] })),
    ]).then(([u, h]) => {
      setUser(u.data)
      setLoginHistory(h.data)
    }).finally(() => setLoading(false))
  }, [])

  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <Layout>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem', letterSpacing: '-0.02em' }}>Profile</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>Your account details</p>

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Profile card */}
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #3B82F6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 700, color: '#fff',
                margin: '0 auto 1rem', boxShadow: '0 0 24px rgba(16,185,129,0.25)'
              }}>{initials}</div>

              <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{user?.full_name}</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>{user?.email}</p>

              <span className={`badge ${user?.role === 'ADMIN' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.75rem' }}>
                <Shield size={10} style={{ display: 'inline', marginRight: 4 }} />{user?.role}
              </span>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-card2)', borderRadius: 10, textAlign: 'left' }}>
                {[
                  { icon: Mail,  label: 'Email', value: user?.email },
                  { icon: Phone, label: 'Phone', value: user?.phone || 'Not set' },
                  { icon: User,  label: 'Status', value: user?.is_active === 'Y' ? 'Active' : 'Locked' },
                  { icon: Clock, label: 'Joined', value: new Date(user?.created_at).toLocaleDateString('en-IN') },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <Icon size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Login history */}
            <div className="card">
              <h3 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.25rem' }}>Recent Login Activity</h3>
              {loginHistory.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No login history available.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {loginHistory.map((h, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.7rem 0.9rem', background: 'var(--bg-card2)',
                      borderRadius: 10, border: '1px solid var(--border)'
                    }}>
                      <div style={{ flexShrink: 0 }}>
                        {h.success === 'Y'
                          ? <CheckCircle size={16} color="#10B981" />
                          : <XCircle size={16} color="#EF4444" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                          {h.success === 'Y' ? 'Successful login' : 'Failed login attempt'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                          IP: {h.ip_address || 'Unknown'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'right' }}>
                        {new Date(h.login_time).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
