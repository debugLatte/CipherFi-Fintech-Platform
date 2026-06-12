import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, ArrowLeftRight, Receipt,
  BarChart3, ShieldAlert, LogOut, Settings,
  CreditCard, User, Target
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts',     icon: CreditCard,      label: 'Accounts'  },
  { to: '/transfer',     icon: ArrowLeftRight,  label: 'Transfer'  },
  { to: '/expenses',     icon: Receipt,         label: 'Expenses'  },
  { to: '/budgets',      icon: Target,          label: 'Budgets'   },
  { to: '/analytics',    icon: BarChart3,        label: 'Analytics' },
  { to: '/fraud',        icon: ShieldAlert,     label: 'Fraud'     },
  { to: '/profile',      icon: User,            label: 'Profile'   },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'U'

  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', padding: '1.5rem 1rem', flexShrink: 0
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem', paddingLeft: '0.5rem' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#000'
        }}>F</div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>FinTrack</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.75rem', borderRadius: 10, fontSize: '0.875rem',
            fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s',
            background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
            color: isActive ? '#10B981' : 'var(--muted)',
            borderLeft: isActive ? '2px solid #10B981' : '2px solid transparent',
          })}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {user?.role === 'ADMIN' && (
          <NavLink to="/admin" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.75rem', borderRadius: 10, fontSize: '0.875rem',
            fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s',
            background: isActive ? 'rgba(239,68,68,0.1)' : 'transparent',
            color: isActive ? '#EF4444' : 'var(--muted)',
            borderLeft: isActive ? '2px solid #EF4444' : '2px solid transparent',
          })}>
            <Settings size={16} />
            Admin Panel
          </NavLink>
        )}
      </nav>

      {/* User footer */}
      <div style={{
        borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #10B981, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-ghost" style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '0.5rem', fontSize: '0.8rem'
        }}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  )
}
