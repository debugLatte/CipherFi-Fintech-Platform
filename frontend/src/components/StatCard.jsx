export default function StatCard({ label, value, sub, icon: Icon, accent = '#10B981', loading }) {
  return (
    <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `${accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon size={16} color={accent} />
          </div>
        )}
      </div>
      <div>
        {loading
          ? <div style={{ height: 28, width: 120, background: 'var(--bg-card2)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
          : <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 500, letterSpacing: '-0.03em', color: '#fff' }}>
              {value}
            </div>
        }
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{sub}</div>}
      </div>
    </div>
  )
}
