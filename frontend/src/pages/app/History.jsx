import { useEffect, useMemo, useState } from 'react'
import { Link } from '../../components/Link'
import { Icon } from '../../components/Icon'
import { api } from '../../utils/api'

const iconByType = {
  technical: 'chart',
  behavioral: 'user',
  hr: 'briefcase',
  situational: 'spark',
  problem_solving: 'spark',
  mixed: 'mic',
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function SessionCard({ session }) {
  const isCompleted = session.status === 'completed'
  const icon = iconByType[session.interview_type] || 'mic'
  return <article className="history-session-card"><span className="history-session-icon blue"><Icon name={icon} size={28} /></span><div className="history-session-copy"><h2>{session.target_role} interview</h2><div className="history-meta"><span><Icon name="clock" size={14} />{formatDate(session.completed_at || session.created_at)}</span><span><Icon name="chart" size={14} />{session.interview_type}</span><span><Icon name="bell" size={14} />{isCompleted ? 'Completed' : 'In progress'}</span></div></div><div className="history-score"><strong>{session.overall_score ?? '—'}{session.overall_score != null ? '%' : ''}</strong><span>Overall score</span></div><div className="history-card-actions">{isCompleted ? <Link to={`/feedback/${session.id}`} className="button secondary">View report</Link> : <Link to={`/interview/${session.id}`} className="button secondary">Continue</Link>}<Link to={`/interview/${session.id}`} className="button">Retake</Link></div></article>
}

export function History() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All sessions')

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/api/v1/interviews')
        setSessions(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filteredSessions = useMemo(() => sessions.filter((session) => {
    const role = `${session.target_role || ''} ${session.interview_type || ''}`.toLowerCase()
    const matchesQuery = !query.trim() || role.includes(query.trim().toLowerCase())
    const matchesFilter = filter === 'All sessions' || (filter === 'Completed' && session.status === 'completed') || (filter === 'In Progress' && session.status !== 'completed')
    return matchesQuery && matchesFilter
  }), [sessions, query, filter])

  const completed = sessions.filter((s) => s.status === 'completed')
  const scores = completed.map((s) => s.overall_score).filter((v) => v != null)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return <div className="history-page"><div className="history-intro"><div><span className="eyebrow">YOUR JOURNEY</span><h1>Interview history</h1><p>Every interview you complete is saved here. Search for a specific session and open only that interview's report.</p></div></div>{error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}{loading && <div className="loading-row"><i className="spinner" /> Loading your history…</div>}{!loading && !error && <><section className="history-overview"><article className="panel trajectory-card"><div className="trajectory-head"><div><h2>Performance summary</h2><p>Across all the interviews you have completed</p></div><span className="growth-pill">{sessions.length} sessions</span></div><div className="history-stats-row"><div><strong>{sessions.length}</strong><span>Total interviews</span></div><div><strong>{completed.length}</strong><span>Completed</span></div><div><strong>{avg}%</strong><span>Average score</span></div><div><strong>{sessions.length - completed.length}</strong><span>In progress</span></div></div></article><aside className="history-bento"><article><span>Best score</span><strong>{scores.length ? Math.max(...scores) : '—'}{scores.length ? '%' : ''}</strong><p>Your strongest performance yet.</p></article><article><span>Main focus</span><strong>Consistency</strong><p><Icon name="chart" size={14} /> Keep practising to build on every report.</p></article></aside></section><div className="history-toolbar"><label className="history-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by role or interview type..." /></label><div className="history-filters">{['All sessions', 'Completed', 'In Progress'].map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div></div><section className="history-list">{filteredSessions.length ? filteredSessions.map((session) => <SessionCard key={session.id} session={session} />) : <div className="empty-history"><Icon name="search" size={25} /><h2>No sessions match your search</h2><p>Try a different role, or clear the filters to see everything.</p></div>}</section></>}</div>
}
