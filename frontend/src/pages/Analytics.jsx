import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const COLORS = ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316']

export default function Analytics() {
  const [monthly, setMonthly] = useState([])
  const [catPie, setCatPie]   = useState([])
  const [trend, setTrend]     = useState([])

  useEffect(() => {
    api.get('/analytics/monthly').then(({ data }) => {
      // All-time category totals for pie
      const catMap = {}
      data.forEach(r => { catMap[r.cat_name] = (catMap[r.cat_name] || 0) + Number(r.total_spent) })
      setCatPie(Object.entries(catMap).map(([name, value]) => ({ name, value })))

      // Monthly totals for bar
      const monthMap = {}
      data.forEach(r => {
        const mo = new Date(r.month).toLocaleString('default', { month: 'short', year: '2-digit' })
        monthMap[mo] = (monthMap[mo] || 0) + Number(r.total_spent)
      })
      const sorted = Object.entries(monthMap).slice(-8).map(([month, spent]) => ({ month, spent }))
      setMonthly(sorted)

      // Trend: avg_spend per month
      const trendMap = {}
      data.forEach(r => {
        const mo = new Date(r.month).toLocaleString('default', { month: 'short', year: '2-digit' })
        if (!trendMap[mo]) trendMap[mo] = { total: 0, count: 0 }
        trendMap[mo].total += Number(r.total_spent)
        trendMap[mo].count++
      })
      setTrend(Object.entries(trendMap).slice(-8).map(([month, v]) => ({
        month, avg: Math.round(v.total / v.count)
      })))
    })
  }, [])

  const Section = ({ title, children }) => (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.25rem' }}>{title}</h3>
      {children}
    </div>
  )

  const tooltipStyle = { background: '#0A1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }

  return (
    <Layout>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem', letterSpacing: '-0.02em' }}>Analytics</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>Deep dive into your spending patterns</p>

        <Section title="Monthly Spending (Last 8 Months)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [fmt(v), 'Spent']} />
              <Bar dataKey="spent" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <Section title="Spending by Category">
            {catPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catPie} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {catPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No data yet.</p>}
          </Section>

          <Section title="Avg Monthly Spend Trend">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmt(v), 'Avg']} />
                <Line type="monotone" dataKey="avg" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Category table */}
        <div className="card">
          <h3 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '1rem' }}>Category Breakdown</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Category','Total Spent','Share'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catPie.sort((a,b) => b.value - a.value).map((c, i) => {
                  const total = catPie.reduce((s, x) => s + x.value, 0)
                  const pct = ((c.value / total) * 100).toFixed(1)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.7rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                          {c.name}
                        </div>
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>{fmt(c.value)}</td>
                      <td style={{ padding: '0.7rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ height: 6, width: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
