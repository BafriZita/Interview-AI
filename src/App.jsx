import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { PublicShell } from './components/PublicShell'
import { Landing } from './pages/public/Landing'
import { Login, Register, ForgotPassword } from './pages/auth/AuthPages'
import { Home } from './pages/app/Home'
import { Resume } from './pages/app/Resume'
import { JobDescription } from './pages/app/JobDescription'
import { Interview } from './pages/app/Interview'
import { Reports } from './pages/app/Reports'
import { History } from './pages/app/History'
import { Recommendations } from './pages/app/Recommendations'
import { Expectations } from './pages/app/Expectations'
import { Profile } from './pages/app/Profile'
import { NotFound } from './pages/NotFound'
import './App.css'

const routes = {
  '/': { page: <Landing />, public: true },
  '/login': { page: <Login />, public: true, auth: true },
  '/register': { page: <Register />, public: true, auth: true },
  '/forgot-password': { page: <ForgotPassword />, public: true, auth: true },
  '/home': { page: <Home /> },
  '/resume': { page: <Resume /> },
  '/job-description': { page: <JobDescription /> },
  '/interview': { page: <Interview /> },
  '/reports': { page: <Reports /> },
  '/history': { page: <History /> },
  '/recommendations': { page: <Recommendations /> },
  '/expectations': { page: <Expectations /> },
  '/profile': { page: <Profile /> },
}

function App() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/')
  useEffect(() => {
    const sync = () => setPath(window.location.pathname.replace(/\/$/, '') || '/')
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  const route = routes[path]
  if (!route) return <NotFound />
  if (route.auth) return route.page
  return route.public ? <PublicShell>{route.page}</PublicShell> : <AppShell path={path}>{route.page}</AppShell>
}

export default App
