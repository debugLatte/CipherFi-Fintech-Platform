import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function Transfer() {
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState({ from_acc_id: '', to_account: '', amount: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { ok, msg }
  const [txns, setTxns] = useState([])

  useEffect(() => {
    api.get('/accounts/').then(r => setAccounts(r.data))
    api.get('/transactions/?limit=10').then(r => setTxns(r.data))
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    setResult(null); setLoading(true)
    try {
      await api.post('/transactions/transfer', {
        ...form,
        from_acc_id: Number(form.from_acc_id),
        amount: Number(form.amount)
      })
      setResult({ ok: true, msg: 'Transfer successful!' })
      setForm({ from_acc_id: '', to_account: '', amount: '', description: '' })
      const [a, t] = await Promise.all([api.get('/accounts/'), api.get('/transactions/?limit=10')])
      setAccounts(a.data); setTxns(t.data)
    } catch (e) {
      const errorMsg = e.response?.data?.error || 'Transfer failed'
      const hint = e.response?.data?.hint
      setResult({ ok: false, msg: hint ? `${errorMsg}. ${hint}` : errorMsg })
    } finally { setLoading(false) }
  }

  const selected = id => accounts.find(a => a.account_id === Number(id))

  return (
    <Layout>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem', letterSpacing: '-0.02em' }}>Transfer Money</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>Move funds between accounts securely</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Form */}
          <div className="card">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>From Account</label>
                <select className="input" value={form.from_acc_id}
                  onChange={e => setForm({ ...form, from_acc_id: e.target.value })} required>
                  <option value="">Select account</option>
                  {accounts.map(a => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.acc_number} ({a.acc_type}) — {fmt(a.balance)}
                    </option>
                  ))}
                </select>
                {form.from_acc_id && (
                  <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.35rem' }}>
                    Balance: {fmt(selected(form.from_acc_id)?.balance)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ArrowRight size={16} color="#10B981" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>To Account (ID or Number)</label>
                <input className="input" type="text" placeholder="Examples: 3, ACC2001, 1116"
                  value={form.to_account} onChange={e => setForm({ ...form, to_account: e.target.value })} required />
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                  You can enter account_id (e.g. 3) or account number (e.g. ACC1116 or 1116)
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Amount (₹)</label>
                <input className="input mono" type="number" min="1" step="0.01" placeholder="0.00"
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Description (optional)</label>
                <input className="input" type="text" placeholder="Rent, dinner split, etc."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              {result && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.7rem 0.9rem', borderRadius: 8, fontSize: '0.82rem',
                  background: result.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${result.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  color: result.ok ? '#10B981' : '#EF4444'
                }}>
                  {result.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {result.msg}
                </div>
              )}

              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '0.8rem' }}>
                {loading ? 'Processing…' : 'Transfer Now'}
              </button>
            </form>
          </div>

          {/* Recent */}
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Recent Transactions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {txns.map(t => (
                <div key={t.txn_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.7rem 0.9rem', background: 'var(--bg-card2)',
                  borderRadius: 10, border: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{t.description || t.txn_type}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
                      {t.from_acc} → {t.to_acc} · {new Date(t.txn_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 500 }}>{fmt(t.amount)}</span>
                    <span className={`badge badge-${t.status === 'SUCCESS' ? 'green' : t.status === 'FLAGGED' ? 'yellow' : 'red'}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
