import { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import { PageHeader, Tag } from '../../components/UI'
import { Icon } from '../../components/Icon'

const typeIcon = { report: 'chart', resume: 'file', interview: 'mic', general: 'bell', security: 'lock' }

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api('/api/v1/notifications')
      setItems(data.notifications || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { (async () => { await load() })() }, [])

  const markAllRead = async () => {
    await api('/api/v1/notifications/read-all', { method: 'POST' }).catch(() => {})
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markRead = async (id) => {
    await api(`/api/v1/notifications/${id}/read`, { method: 'POST' }).catch(() => {})
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const unread = items.filter((n) => !n.read).length

  return <>
    <PageHeader eyebrow="INBOX" title="Notifications" text="Stay on top of interview results, resume insights and account activity." action={unread > 0 ? <button className="button secondary" onClick={markAllRead}><Icon name="check" size={15} /> Mark all as read</button> : null} />
    {error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}
    {loading && <div className="loading-row"><i className="spinner" /> Loading notifications…</div>}
    {!loading && !error && items.length === 0 && <div className="panel empty-notifications"><span><Icon name="bell" size={26} /></span><h2>No notifications yet</h2><p>When you finish interviews or upload a resume, updates will appear here.</p></div>}
    {!loading && items.length > 0 && <section className="notification-page-list">
      {items.map((n) => (
        <article key={n.id} className={`notification-page-item${n.read ? '' : ' unread'}`} onClick={() => !n.read && markRead(n.id)}>
          <span className={`notification-page-icon ${n.type || 'general'}`}><Icon name={typeIcon[n.type] || 'bell'} size={17} /></span>
          <div className="notification-page-copy">
            <div className="notification-page-head"><strong>{n.title}</strong>{n.read ? <Tag>Read</Tag> : <Tag tone="violet">New</Tag>}</div>
            {n.body && <p>{n.body}</p>}
            <time>{timeAgo(n.created_at)}</time>
          </div>
          {!n.read && <span className="unread-dot" />}
        </article>
      ))}
    </section>}
  </>
}
