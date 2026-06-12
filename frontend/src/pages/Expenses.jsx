import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { Plus, Trash2, TrendingDown } from 'lucide-react'

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function Expenses() {
  const [expenses, setExpenses]     = useState([])
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets]       = useState([])
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState({ cat_id: '', amount: '', note: '', exp_date: '' })
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState('')

  const load = () => Promise.all([
    api.get('/analytics/expenses'),
    api.get('/analytics/categories'),
    api.get('/analytics/budget-status'),
  ]).then(([e, c, b]) => { setExpenses(e.data); setCategories(c.data); setBudgets(b.data) })

  useEffect(() => { load() }, [])

  const addExpense = async e => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      await api.post('/analytics/expenses', { ...form, cat_id: Number(form.cat_id), amount: Number(form.amount) })
      setShowModal(false); setForm({ cat_id: '', amount: '', note: '', exp_date: '' })
      load()
    } catch (e) { setErr(e.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  const deleteExpense = async id => {
    await api.delete(`/analytics/expenses/${id}`)
    setExpenses(prev => prev.filter(e => e.exp_id !== id))
  }

  const statusColor = s => s === 'OK' ? '#10B981' : s === 'WARNING' ? '#F59E0B' : '#EF4444'
  const statusBadge = s => s === 'OK' ? 'badge-green' : s === 'WARNING' ? 'badge-yellow' : 'badge-red'

  return (
    <Layout>
      <div className="fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Expenses</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Track and manage your spending</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} /> Add Expense
          </button>
        </div>

        {/* Budget cards */}
        {budgets.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--muted)' }}>THIS MONTH'S BUDGETS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {budgets.map((b, i) => {
                const pct = Math.min(100, (Number(b.amount_spent) / Number(b.monthly_limit)) * 100)
                return (
                  <div key={i} className="card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.82rem' }}>{b.cat_name}</span>
                      <span className={`badge ${statusBadge(b.budget_status)}`}>{b.budget_status}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: '0.5rem' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: statusColor(b.budget_status), borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)' }}>
                      <span>{fmt(b.amount_spent)} spent</span>
                      <span>{fmt(b.monthly_limit)} limit</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Expense list */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>All Expenses</h3>
          {expenses.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No expenses recorded yet.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Date','Category','Note','Amount',''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.exp_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.1s' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.78rem' }}>
                          {new Date(e.exp_date).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem' }}>
                          <span className="badge badge-blue">{e.cat_name}</span>
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)' }}>{e.note || '—'}</td>
                        <td style={{ padding: '0.7rem 0.75rem', fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>
                          {fmt(e.amount)}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem' }}>
                          <button onClick={() => deleteExpense(e.exp_id)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--muted)', padding: '0.2rem'
                          }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

        {/* Add modal */}
        {showModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }}>
            <div className="card fade-up" style={{ width: '100%', maxWidth: 420, padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Add Expense</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.25rem' }}>×</button>
              </div>
              <form onSubmit={addExpense} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>Category</label>
                  <select className="input" value={form.cat_id} onChange={e => setForm({ ...form, cat_id: e.target.value })} required>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.cat_id} value={c.cat_id}>{c.cat_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>Amount (₹)</label>
                  <input className="input mono" type="number" min="1" step="0.01" placeholder="0.00"
                    value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>Note</label>
                  <input className="input" type="text" placeholder="What was this for?"
                    value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>Date</label>
                  <input className="input" type="date"
                    value={form.exp_date} onChange={e => setForm({ ...form, exp_date: e.target.value })} />
                </div>
                {err && <div style={{ fontSize: '0.8rem', color: '#EF4444' }}>{err}</div>}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Adding…' : 'Add'}
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
