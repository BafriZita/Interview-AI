import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { PublicShell } from './components/PublicShell'
import { Landing } from './pages/public/Landing'
import { Login, Register, ForgotPassword, ResetPassword } from './pages/auth/AuthPages'
import { Home } from './pages/app/Home'
import { Resume } from './pages/app/Resume'
import { JobDescription } from './pages/app/JobDescription'
import { Interview } from './pages/app/Interview'
import { Reports, ReportDetail } from './pages/app/Reports'
import { History } from './pages/app/History'
import { Expectations } from './pages/app/Expectations'
import { Profile } from './pages/app/Profile'
import { Settings } from './pages/app/Settings'
import { Notifications } from './pages/app/Notifications'
import { NotFound } from './pages/NotFound'
import './App.css'

const routes = {
  '/': { page: <Landing />, public: true },
  '/login': { page: <Login />, public: true, auth: true },
  '/register': { page: <Register />, public: true, auth: true },
  '/forgot-password': { page: <ForgotPassword />, public: true, auth: true },
  '/reset-password': { page: <ResetPassword />, public: true, auth: true },
  '/home': { page: <Home /> },
  '/resume': { page: <Resume /> },
  '/job-description': { page: <JobDescription /> },
  '/interview': { page: <Interview /> },
  '/reports': { page: <Reports /> },
  '/feedback': { page: <Reports /> },
  '/history': { page: <History /> },
  '/expectations': { page: <Expectations /> },
  '/profile': { page: <Profile /> },
  '/settings': { page: <Settings /> },
  '/notifications': { page: <Notifications /> },
}

function resolveRoute(path) {
  if (routes[path]) return routes[path]
  const feedbackMatch = path.match(/^\/feedback\/(\d+)$/)
  if (feedbackMatch) return { page: <ReportDetail sessionId={feedbackMatch[1]} /> }
  const interviewMatch = path.match(/^\/interview\/(\d+)$/)
  if (interviewMatch) return { page: <Interview sessionId={interviewMatch[1]} /> }
  return null
}

function App() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/')
  useEffect(() => {
    const sync = () => setPath(window.location.pathname.replace(/\/$/, '') || '/')
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  const route = resolveRoute(path)
  if (!route) return <NotFound />
  if (route.auth) return route.page
  return route.public ? <PublicShell>{route.page}</PublicShell> : <AppShell path={path}>{route.page}</AppShell>
}

export default App
