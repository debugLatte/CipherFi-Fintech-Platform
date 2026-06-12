import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react'

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function Fraud() {
  const [alerts, setAlerts]     = useState([])
  const [riskScore, setRiskScore] = useState(0)
  const [loading, setLoading]   = useState(true)

  const load = () => Promise.all([
    api.get('/fraud/alerts'),
    api.get('/fraud/risk-score'),
  ]).then(([a, r]) => {
    setAlerts(a.data)
    setRiskScore(r.data.risk_score)
  }).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const resolve = async id => {
    await api.patch(`/fraud/alerts/${id}/resolve`)
    setAlerts(prev => prev.map(a => a.alert_id === id ? { ...a, is_resolved: 'Y' } : a))
  }

  const open = alerts.filter(a => a.is_resolved === 'N')
  const resolved = alerts.filter(a => a.is_resolved === 'Y')

  const riskColor = riskScore >= 60 ? '#EF4444' : riskScore >= 30 ? '#F59E0B' : '#10B981'
  const riskLabel = riskScore >= 60 ? 'High Risk' : riskScore >= 30 ? 'Medium Risk' : 'Low Risk'

  const sevBadge = s => s === 'HIGH' ? 'badge-red' : s === 'MEDIUM' ? 'badge-yellow' : 'badge-green'

  const AlertRow = ({ a }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '1rem', background: a.is_resolved === 'N' ? 'rgba(239,68,68,0.04)' : 'var(--bg-card2)',
      borderRadius: 10, border: `1px solid ${a.is_resolved === 'N' ? 'rgba(239,68,68,0.15)' : 'var(--border)'}`,
      transition: 'all 0.2s'
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: a.is_resolved === 'N' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {a.is_resolved === 'N' ? <AlertTriangle size={18} color="#EF4444" /> : <ShieldCheck size={18} color="#10B981" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem' }}>{a.reason}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
          TXN #{a.txn_id} · {a.acc_number} · {fmt(a.amount)} · {new Date(a.flagged_at).toLocaleString('en-IN')}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        <span className={`badge ${sevBadge(a.severity)}`}>{a.severity}</span>
        {a.is_resolved === 'N' && (
          <button className="btn-ghost" onClick={() => resolve(a.alert_id)} style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
            Resolve
          </button>
        )}
        {a.is_resolved === 'Y' && <span className="badge badge-green">RESOLVED</span>}
      </div>
    </div>
  )

  return (
    <Layout>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem', letterSpacing: '-0.02em' }}>Fraud Detection</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>Monitor suspicious activity on your accounts</p>

        {/* Risk score card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="55" cy="55" r="45" fill="none"
                stroke={riskColor} strokeWidth="10"
                strokeDasharray={`${(riskScore / 100) * 283} 283`}
                strokeLinecap="round"
                transform="rotate(-90 55 55)"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 500, color: riskColor }}>{Math.round(riskScore)}</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>/ 100</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: riskColor, marginBottom: '0.3rem' }}>{riskLabel}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: 320 }}>
              {riskScore < 30
                ? 'Your account activity looks normal. No suspicious patterns detected.'
                : riskScore < 60
                ? 'Some unusual activity detected. Review the alerts below.'
                : 'High fraud risk detected. Please review and resolve open alerts immediately.'}
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{open.length}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Open alerts</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{resolved.length}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Resolved</div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading alerts…</p>
        ) : (
          <>
            {open.length > 0 && (
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '1rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={16} /> Open Alerts ({open.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {open.map(a => <AlertRow key={a.alert_id} a={a} />)}
                </div>
              </div>
            )}

            {resolved.length > 0 && (
              <div className="card">
                <h3 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--muted)' }}>
                  Resolved Alerts ({resolved.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {resolved.map(a => <AlertRow key={a.alert_id} a={a} />)}
                </div>
              </div>
            )}

            {alerts.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <ShieldCheck size={48} color="#10B981" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>All Clear</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No fraud alerts on your account.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
