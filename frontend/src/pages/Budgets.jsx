import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { Plus, Target, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const statusMeta = {
  OK:       { icon: CheckCircle,   color: '#10B981', bg: 'rgba(16,185,129,0.1)',  badge: 'badge-green' },
  WARNING:  { icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', badge: 'badge-yellow' },
  EXCEEDED: { icon: XCircle,       color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  badge: 'badge-red' },
}

export default function Budgets() {
  const [budgets, setBudgets]       = useState([])
  const [categories, setCategories] = useState([])
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState({ cat_id: '', monthly_limit: '' })
  const [err, setErr]               = useState('')
  const [loading, setLoading]       = useState(false)

  const load = () => Promise.all([
    api.get('/analytics/budget-status'),
    api.get('/analytics/categories'),
  ]).then(([b, c]) => { setBudgets(b.data); setCategories(c.data) })

  useEffect(() => { load() }, [])

  const saveBudget = async e => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      await api.post('/analytics/budgets', { cat_id: Number(form.cat_id), monthly_limit: Number(form.monthly_limit) })
      setShowModal(false); setForm({ cat_id: '', monthly_limit: '' })
      load()
    } catch (e) { setErr(e.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const totalLimit = budgets.reduce((s, b) => s + Number(b.monthly_limit), 0)
  const totalSpent = budgets.reduce((s, b) => s + Number(b.amount_spent), 0)
  const overCount  = budgets.filter(b => b.budget_status === 'EXCEEDED').length
  const warnCount  = budgets.filter(b => b.budget_status === 'WARNING').length

  return (
    <Layout>
      <div className="fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Budgets</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Set and track monthly spending limits</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} /> Set Budget
          </button>
        </div>

        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total Budget',   value: fmt(totalLimit), accent: '#10B981' },
            { label: 'Total Spent',    value: fmt(totalSpent), accent: '#F59E0B' },
            { label: 'Remaining',      value: fmt(totalLimit - totalSpent), accent: '#3B82F6' },
            { label: 'Exceeded',       value: overCount,  accent: '#EF4444' },
            { label: 'Warnings',       value: warnCount,  accent: '#F59E0B' },
          ].map(s => (
            <div key={s.label} className="card-sm" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
              <span className="mono" style={{ fontSize: '1.35rem', fontWeight: 500, color: s.accent }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Overall progress */}
        {totalLimit > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Overall Budget Usage</span>
              <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                {fmt(totalSpent)} / {fmt(totalLimit)} ({((totalSpent / totalLimit) * 100).toFixed(0)}%)
              </span>
            </div>
            <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (totalSpent / totalLimit) * 100)}%`,
                background: totalSpent > totalLimit ? '#EF4444' : totalSpent > totalLimit * 0.8 ? '#F59E0B' : '#10B981',
                borderRadius: 5, transition: 'width 0.8s ease'
              }} />
            </div>
          </div>
        )}

        {/* Budget cards */}
        {budgets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Target size={48} color="#64748B" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No budgets set</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Set monthly budgets to keep your spending on track.
            </p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Set your first budget</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {budgets.map((b, i) => {
              const pct = Math.min(100, (Number(b.amount_spent) / Number(b.monthly_limit)) * 100)
              const meta = statusMeta[b.budget_status] || statusMeta.OK
              const Icon = meta.icon
              return (
                <div key={i} className="card" style={{ borderLeft: `3px solid ${meta.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{b.cat_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>This month</div>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} color={meta.color} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '0.15rem' }}>SPENT</div>
                      <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 500, color: meta.color }}>{fmt(b.amount_spent)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '0.15rem' }}>LIMIT</div>
                      <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 500 }}>{fmt(b.monthly_limit)}</div>
                    </div>
                  </div>

                  <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: '0.6rem' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: meta.color, borderRadius: 4, transition: 'width 0.7s ease'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {fmt(b.remaining)} remaining
                    </span>
                    <span className={`badge ${meta.badge}`}>{b.budget_status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }}>
            <div className="card fade-up" style={{ width: '100%', maxWidth: 400, padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Set Monthly Budget</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.25rem' }}>×</button>
              </div>
              <form onSubmit={saveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>Category</label>
                  <select className="input" value={form.cat_id} onChange={e => setForm({ ...form, cat_id: e.target.value })} required>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.cat_id} value={c.cat_id}>{c.cat_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>Monthly Limit (₹)</label>
                  <input className="input mono" type="number" min="1" step="100" placeholder="5000"
                    value={form.monthly_limit} onChange={e => setForm({ ...form, monthly_limit: e.target.value })} required />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '-0.25rem' }}>
                  If a budget for this category already exists this month, it will be updated.
                </p>
                {err && <div style={{ fontSize: '0.8rem', color: '#EF4444' }}>{err}</div>}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Saving…' : 'Save Budget'}
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
