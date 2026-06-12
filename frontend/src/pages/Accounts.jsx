import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { Plus, CreditCard, Wallet, TrendingUp, Snowflake } from 'lucide-react'

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [overview, setOverview] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ acc_number: '', acc_type: 'SAVINGS' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => Promise.all([
    api.get('/accounts/'),
    api.get('/accounts/overview'),
  ]).then(([a, o]) => { setAccounts(a.data); setOverview(o.data) })

  useEffect(() => { load() }, [])

  const createAccount = async e => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      await api.post('/accounts/', form)
      setShowModal(false); setForm({ acc_number: '', acc_type: 'SAVINGS' })
      load()
    } catch (e) { setErr(e.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const accIcon = type => type === 'SAVINGS' ? Wallet : CreditCard
  const accColor = type => type === 'SAVINGS' ? '#10B981' : '#3B82F6'

  return (
    <Layout>
      <div className="fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Accounts</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Manage your bank accounts</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} /> Add Account
          </button>
        </div>

        {/* Overview strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total Accounts', value: overview.total_accounts ?? '—', icon: CreditCard, accent: '#10B981' },
            { label: 'Total Balance',  value: fmt(overview.total_balance),    icon: Wallet,     accent: '#3B82F6' },
            { label: 'Highest Balance',value: fmt(overview.highest_balance),  icon: TrendingUp, accent: '#8B5CF6' },
          ].map(s => (
            <div key={s.label} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{s.label}</div>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 500, color: '#fff' }}>{s.value}</div>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={18} color={s.accent} />
              </div>
            </div>
          ))}
        </div>

        {/* Account cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {accounts.map(a => {
            const Icon = accIcon(a.acc_type)
            const color = accColor(a.acc_type)
            return (
              <div key={a.account_id} style={{
                borderRadius: 16, padding: '1.5rem',
                background: `linear-gradient(135deg, ${color}18 0%, rgba(255,255,255,0.02) 100%)`,
                border: `1px solid ${color}30`, position: 'relative', overflow: 'hidden'
              }}>
                {/* decorative circle */}
                <div style={{
                  position: 'absolute', top: -30, right: -30,
                  width: 110, height: 110, borderRadius: '50%',
                  background: `${color}10`, pointerEvents: 'none'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={color} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {a.is_frozen === 'Y' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#60A5FA', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                        <Snowflake size={10} /> Frozen
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', color, background: `${color}15`, border: `1px solid ${color}30`, padding: '0.2rem 0.6rem', borderRadius: 6, fontWeight: 600 }}>
                      {a.acc_type}
                    </span>
                  </div>
                </div>

                <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
                  {fmt(a.balance)}
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
                  {a.acc_number}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
                  {a.currency} · Opened {new Date(a.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            )
          })}

          {/* Add placeholder */}
          <button onClick={() => setShowModal(true)} style={{
            borderRadius: 16, padding: '1.5rem', minHeight: 160,
            background: 'transparent', border: '1px dashed rgba(255,255,255,0.12)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            color: 'var(--muted)', transition: 'all 0.2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            <Plus size={24} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Add Account</span>
          </button>
        </div>

        {/* Modal */}
        {showModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }}>
            <div className="card fade-up" style={{ width: '100%', maxWidth: 400, padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Add Account</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.25rem' }}>×</button>
              </div>
              <form onSubmit={createAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>Account Number</label>
                  <input className="input mono" placeholder="e.g. ACC4001" value={form.acc_number}
                    onChange={e => setForm({ ...form, acc_number: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>Account Type</label>
                  <select className="input" value={form.acc_type} onChange={e => setForm({ ...form, acc_type: e.target.value })}>
                    <option value="SAVINGS">Savings</option>
                    <option value="CURRENT">Current</option>
                  </select>
                </div>
                {err && <div style={{ fontSize: '0.8rem', color: '#EF4444' }}>{err}</div>}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
