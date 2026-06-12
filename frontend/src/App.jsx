import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Login     from './pages/Login'
import Register  from './pages/Register'
import Dashboard from './pages/Dashboard'
import Accounts  from './pages/Accounts'
import Transfer  from './pages/Transfer'
import Expenses  from './pages/Expenses'
import Analytics from './pages/Analytics'
import Fraud     from './pages/Fraud'
import Budgets   from './pages/Budgets'
import Profile   from './pages/Profile'
import Admin     from './pages/Admin'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/accounts"  element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/transfer"  element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
          <Route path="/expenses"  element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
          <Route path="/budgets"   element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/fraud"     element={<ProtectedRoute><Fraud /></ProtectedRoute>} />
          <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin"     element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
