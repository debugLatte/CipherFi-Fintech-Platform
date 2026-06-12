import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'
import {
  Users, Activity, ShieldAlert, DollarSign, TrendingUp,
  Lock, Unlock, CheckCircle, BarChart2, AlertTriangle, LogOut
} from 'lucide-react'

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const StatBox = ({ label, value, icon: Icon, accent = '#10B981' }) => (
  <div style={{
    background: '#0A1020', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{label}</span>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={14} color={accent} />
      </div>
    </div>
    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '1.5rem', fontWeight: 500, color: '#fff', letterSpacing: '-0.03em' }}>
      {value ?? '—'}
    </div>
  </div>
)

const Tab = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
    border: 'none', borderBottom: `2px solid ${active ? '#10B981' : 'transparent'}`,
    color: active ? '#10B981' : '#64748B', fontFamily: 'Outfit, sans-serif',
    fontWeight: 500, fontSize: '0.875rem', padding: '0.6rem 1.1rem',
    cursor: 'pointer', transition: 'all 0.15s', borderRadius: '8px 8px 0 0'
  }}>{label}</button>
)

export default function Admin() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats]     = useState({})
  const [users, setUsers]     = useState([])
  const [alerts, setAlerts]   = useState([])
  const [txns, setTxns]       = useState([])
  const [logs, setLogs]       = useState([])
  const [tab, setTab]         = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/dashboard'); return }
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/admin/fraud-alerts'),
      api.get('/admin/transactions'),
      api.get('/admin/audit-logs'),
    ]).then(([s, u, a, t, l]) => {
      setStats(s.data); setUsers(u.data); setAlerts(a.data); setTxns(t.data); setLogs(l.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const toggleUser = async uid => {
    const { data } = await api.patch(`/admin/users/${uid}/toggle-active`)
    setUsers(prev => prev.map(u => u.user_id === uid ? { ...u, is_active: data.is_active } : u))
  }

  const resolveAlert = async id => {
    await api.patch(`/admin/fraud-alerts/${id}/resolve`)
    setAlerts(prev => prev.map(a => a.alert_id === id ? { ...a, is_resolved: 'Y' } : a))
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const sevBadge = s => s === 'HIGH' ? 'badge-red' : s === 'MEDIUM' ? 'badge-yellow' : 'badge-green'

  return (
    <div style={{ minHeight: '100vh', background: '#060B18', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        background: '#0A1020', borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BarChart2 size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>FinTrack Admin</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Platform Management Console</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Signed in as <span style={{ color: '#10B981' }}>{user?.full_name}</span></span>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
            User View
          </button>
          <button onClick={handleLogout} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#EF4444', borderRadius: 8, padding: '0.4rem 0.9rem',
            fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'Outfit, sans-serif'
          }}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      <div style={{ flex: 1, padding: '2rem', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748B' }}>
            Loading platform data…
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatBox label="Total Users"    value={stats.total_users}         icon={Users}       />
              <StatBox label="Active Users"   value={stats.active_users}        icon={Activity}    accent="#3B82F6" />
              <StatBox label="Locked Users"   value={stats.locked_users}        icon={Lock}        accent="#EF4444" />
              <StatBox label="Total Txns"     value={stats.total_transactions}  icon={TrendingUp}  accent="#8B5CF6" />
              <StatBox label="Flagged Txns"   value={stats.flagged_transactions}icon={AlertTriangle} accent="#F59E0B" />
              <StatBox label="Open Alerts"    value={stats.open_fraud_alerts}   icon={ShieldAlert} accent="#EF4444" />
              <StatBox label="Platform Funds" value={fmt(stats.total_funds)}    icon={DollarSign}  accent="#10B981" />
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '1.5rem', display: 'flex', gap: '0.25rem' }}>
              {[
                { key: 'overview', label: 'Users' },
                { key: 'fraud',    label: `Fraud Alerts ${alerts.filter(a=>a.is_resolved==='N').length > 0 ? `(${alerts.filter(a=>a.is_resolved==='N').length})` : ''}` },
                { key: 'txns',     label: 'Transactions' },
                { key: 'audit',    label: 'Audit Logs' },
              ].map(t => <Tab key={t.key} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />)}
            </div>

            {/* USERS TAB */}
            {tab === 'overview' && (
              <div style={{ background: '#0A1020', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                      {['User','Email','Role','Accounts','Balance','Risk Score','Alerts','Status','Action'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{u.full_name}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>{u.email}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className={`badge ${u.role === 'ADMIN' ? 'badge-red' : 'badge-blue'}`}>{u.role}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{u.total_accounts}</td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'DM Mono, monospace', fontSize: '0.78rem' }}>{fmt(u.total_balance)}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ color: Number(u.risk_score) >= 60 ? '#EF4444' : Number(u.risk_score) >= 30 ? '#F59E0B' : '#10B981', fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>
                            {u.risk_score}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          {Number(u.open_fraud_alerts) > 0
                            ? <span className="badge badge-red">{u.open_fraud_alerts}</span>
                            : <span style={{ color: '#64748B' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className={`badge ${u.is_active === 'Y' ? 'badge-green' : 'badge-red'}`}>
                            {u.is_active === 'Y' ? 'Active' : 'Locked'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {u.role !== 'ADMIN' && (
                            <button onClick={() => toggleUser(u.user_id)} style={{
                              background: u.is_active === 'Y' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                              border: `1px solid ${u.is_active === 'Y' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                              color: u.is_active === 'Y' ? '#EF4444' : '#10B981',
                              borderRadius: 6, padding: '0.3rem 0.7rem', fontSize: '0.75rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'Outfit, sans-serif'
                            }}>
                              {u.is_active === 'Y' ? <><Lock size={11} /> Lock</> : <><Unlock size={11} /> Unlock</>}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* FRAUD TAB */}
            {tab === 'fraud' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.length === 0 && <p style={{ color: '#64748B' }}>No fraud alerts.</p>}
                {alerts.map(a => (
                  <div key={a.alert_id} style={{
                    background: '#0A1020', border: `1px solid ${a.is_resolved === 'N' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 12, padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem'
                  }}>
                    <AlertTriangle size={18} color={a.is_resolved === 'N' ? '#EF4444' : '#64748B'} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{a.reason}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 3 }}>
                        {a.full_name} · {a.email} · {a.acc_number} · {fmt(a.amount)} · TXN #{a.txn_id} · {new Date(a.flagged_at).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0 }}>
                      <span className={`badge ${sevBadge(a.severity)}`}>{a.severity}</span>
                      {a.is_resolved === 'N'
                        ? <button onClick={() => resolveAlert(a.alert_id)} style={{
                            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                            color: '#10B981', borderRadius: 6, padding: '0.3rem 0.75rem',
                            fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'Outfit, sans-serif'
                          }}><CheckCircle size={12} /> Resolve</button>
                        : <span className="badge badge-green">RESOLVED</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TRANSACTIONS TAB */}
            {tab === 'txns' && (
              <div style={{ background: '#0A1020', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                      {['ID','User','From','To','Amount','Type','Status','Time'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.7rem 1rem', color: '#64748B', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map(t => (
                      <tr key={t.txn_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.7rem 1rem', color: '#64748B', fontFamily: 'DM Mono, monospace', fontSize: '0.75rem' }}>#{t.txn_id}</td>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 500 }}>{t.full_name}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>{t.from_acc}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>{t.to_acc || '—'}</td>
                        <td style={{ padding: '0.7rem 1rem', fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>{fmt(t.amount)}</td>
                        <td style={{ padding: '0.7rem 1rem' }}><span className="badge badge-blue">{t.txn_type}</span></td>
                        <td style={{ padding: '0.7rem 1rem' }}>
                          <span className={`badge badge-${t.status === 'SUCCESS' ? 'green' : t.status === 'FLAGGED' ? 'yellow' : 'red'}`}>{t.status}</span>
                        </td>
                        <td style={{ padding: '0.7rem 1rem', color: '#64748B', fontSize: '0.72rem' }}>{new Date(t.txn_at).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* AUDIT LOGS TAB */}
            {tab === 'audit' && (
              <div style={{ background: '#0A1020', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                      {['Table','Operation','Row ID','Old Value','New Value','Changed At'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.7rem 1rem', color: '#64748B', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.log_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.7rem 1rem' }}><span className="badge badge-blue">{l.table_name}</span></td>
                        <td style={{ padding: '0.7rem 1rem' }}>
                          <span className={`badge ${l.operation === 'INSERT' ? 'badge-green' : l.operation === 'DELETE' ? 'badge-red' : 'badge-yellow'}`}>{l.operation}</span>
                        </td>
                        <td style={{ padding: '0.7rem 1rem', fontFamily: 'DM Mono, monospace', color: '#64748B' }}>#{l.row_id}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#64748B', fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.old_val || '—'}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#E2E8F0', fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.new_val || '—'}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#64748B', fontSize: '0.72rem' }}>{new Date(l.changed_at).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
