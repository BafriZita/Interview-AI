import { useEffect, useState } from 'react'
import { Link } from './Link'
import { Logo } from './Logo'
import { Icon } from './Icon'
import { navigate } from '../utils/navigation'
import { api } from '../utils/api'

const nav = [
  ['/home', 'home', 'Home'],
  ['/interview', 'mic', 'Interview'],
  ['/resume', 'file', 'Resume'],
  ['/job-description', 'briefcase', 'Job match'],
  ['/feedback', 'chart', 'Feedback'],
  ['/history', 'clock', 'History'],
]

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('interviewai.user') || '{}')
  } catch {
    return {}
  }
}

function getProfilePhoto() {
  try {
    return localStorage.getItem('interviewai.profilePhoto') || ''
  } catch {
    return ''
  }
}

function roleLabel(role) {
  return role === 'student' ? 'Student' : role === 'job_seeker' ? 'Job seeker' : 'Job seeker'
}

export function AppShell({ path, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notices, setNotices] = useState([])
  const [unread, setUnread] = useState(0)
  const [loadedAt, setLoadedAt] = useState(0)
  const user = getUser()
  const name = user.username || user.fullName || localStorage.getItem('interviewai.username') || 'Zita'
  const role = roleLabel(user.role)
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const isActive = (url) => path === url || (url === '/feedback' && (path === '/reports' || /^\/feedback\//.test(path)))
  const closeMenus = () => {
    setMenuOpen(false)
    setNotificationsOpen(false)
  }

  const loadNotifications = async () => {
    try {
      const data = await api('/api/v1/notifications')
      setNotices((data.notifications || []).slice(0, 5))
      setUnread(data.unread || 0)
      setLoadedAt(Date.now())
    } catch {
      setNotices([])
      setUnread(0)
    }
  }

  useEffect(() => { (async () => { await loadNotifications() })() }, [])

  const timeAgo = (iso) => {
    if (!iso || !loadedAt) return ''
    const seconds = Math.floor((loadedAt - new Date(iso).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return <div className="app-layout">
    <header className="app-top">
      <div className="app-top-inner">
        <Logo />
        <nav className="app-nav">
          {nav.map(([url, icon, label]) => <Link key={url} to={url} className={isActive(url) ? 'active' : ''}><Icon name={icon} size={16} />{label}</Link>)}
        </nav>
        <div className="top-actions">
          <div className="notification-wrap">
            <button className="icon-button" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Icon name="bell" size={18} />{unread > 0 && <i className="notification-dot" />}</button>
            {notificationsOpen && <div className="notification-center">
              <div className="notification-head"><h2>Notifications</h2><div className="notification-head-actions"><Link to="/notifications" onClick={closeMenus}><Icon name="arrow" size={14} /> View all</Link><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><Icon name="close" size={15} /></button></div></div>
              {notices.length === 0 && <p className="notification-empty">Nothing here yet. Finish an interview or upload a resume to see updates.</p>}
              {notices.map((n) => <div className={`notification-item${n.read ? '' : ' unread'}`} key={n.id} onClick={() => { navigate(`/notifications`); setNotificationsOpen(false) }}><span><Icon name="bell" size={14} /></span><div><strong>{n.title}</strong><p>{n.body}</p></div><time>{timeAgo(n.created_at)}</time></div>)}
            </div>}
          </div>
          <Link to="/profile" className="avatar">{(() => {
            const photo = getProfilePhoto()
            return photo ? <span className="avatar-photo"><img src={photo} alt="profile" /></span> : initials
          })()}</Link>
          <Link to="/profile" className="user-meta"><strong>{name}</strong><span>{role}</span></Link>
        </div>
        <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
      </div>
      {menuOpen && <nav className="mobile-app-nav">
        {nav.map(([url, icon, label]) => <Link key={url} to={url} onClick={closeMenus} className={isActive(url) ? 'active' : ''}><Icon name={icon} size={16} />{label}</Link>)}
        <Link to="/notifications" onClick={closeMenus}><Icon name="bell" size={16} />Notifications</Link>
        <Link to="/profile" onClick={closeMenus}><Icon name="user" size={16} />Profile</Link>
      </nav>}
    </header>
    <main className="app-main"><div className="page-wrap">{children}</div></main>
    <footer className="app-footer"><div><Logo /><p>© 2026 InterviewAI. Precision in preparation.</p></div><nav><a href="/#features">Features</a><a href="/#how">How it works</a><a href="#">Privacy</a><a href="mailto:hello@interviewai.cm">Contact</a></nav></footer>
  </div>
}
