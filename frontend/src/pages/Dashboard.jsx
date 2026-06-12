import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import api from '../api/axios'
import {
  Wallet, TrendingDown, TrendingUp, ShieldAlert,
  ArrowUpRight, ArrowDownLeft, Clock
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316']

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary]   = useState({})
  const [txns, setTxns]         = useState([])
  const [monthly, setMonthly]   = useState([])
  const [catData, setCatData]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/transactions/dashboard'),
      api.get('/transactions/?limit=6'),
      api.get('/analytics/monthly'),
    ]).then(([s, t, m]) => {
      setSummary(s.data)
      setTxns(t.data)

      // Build monthly bar data (last 6 months)
      const byMonth = {}
      m.data.forEach(row => {
        const mo = new Date(row.month).toLocaleString('default', { month: 'short' })
        byMonth[mo] = (byMonth[mo] || 0) + Number(row.total_spent)
      })
      setMonthly(Object.entries(byMonth).slice(-6).map(([month, spent]) => ({ month, spent })))

      // Category pie (current month only)
      const now = new Date()
      const thisMo = now.toISOString().slice(0, 7)
      const catMap = {}
      m.data.filter(r => r.month?.slice(0, 7) === thisMo).forEach(r => {
        catMap[r.cat_name] = (catMap[r.cat_name] || 0) + Number(r.total_spent)
      })
      setCatData(Object.entries(catMap).map(([name, value]) => ({ name, value })))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const riskColor = summary.risk_score >= 60 ? '#EF4444' : summary.risk_score >= 30 ? '#F59E0B' : '#10B981'

  return (
    <Layout>
      <div className="fade-up">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Here's your financial overview
          </p>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard label="Total Balance"    value={fmt(summary.total_balance)}    icon={Wallet}       loading={loading} />
          <StatCard label="Monthly Income"   value={fmt(summary.monthly_income)}   icon={TrendingUp}   accent="#3B82F6" loading={loading} />
          <StatCard label="Monthly Expense"  value={fmt(summary.monthly_expense)}  icon={TrendingDown} accent="#F59E0B" loading={loading} />
          <StatCard label="Risk Score"
            value={loading ? '—' : `${summary.risk_score ?? 0}/100`}
            icon={ShieldAlert} accent={riskColor}
            sub={summary.risk_score >= 60 ? 'High risk' : summary.risk_score >= 30 ? 'Medium risk' : 'Low risk'}
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Monthly Spending</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#0A1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [fmt(v), 'Spent']}
                />
                <Area type="monotone" dataKey="spent" stroke="#10B981" strokeWidth={2} fill="url(#spendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem' }}>By Category</h3>
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0A1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    formatter={v => fmt(v)}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
                No data this month
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Recent Transactions</h3>
          {txns.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No transactions yet.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {txns.map(t => (
                  <div key={t.txn_id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.75rem', background: 'var(--bg-card2)',
                    borderRadius: 10, border: '1px solid var(--border)'
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: t.status === 'SUCCESS' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {t.status === 'SUCCESS'
                        ? <ArrowUpRight size={16} color="#10B981" />
                        : <ArrowDownLeft size={16} color="#EF4444" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t.description || t.txn_type}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                        {t.from_acc} → {t.to_acc}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{fmt(t.amount)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
                        <Clock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        {new Date(t.txn_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <span className={`badge badge-${t.status === 'SUCCESS' ? 'green' : t.status === 'FLAGGED' ? 'yellow' : 'red'}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </Layout>
  )
}
