import { useMemo, useState } from 'react'
import { Link } from '../../components/Link'
import { Icon } from '../../components/Icon'

const sessions = [
  { role: 'Senior Frontend Engineer', date: '14 Nov 2024', duration: '45 mins', company: 'Mock Interview: Linear', score: 92, type: 'Completed', icon: 'file', tone: 'blue' },
  { role: 'Product Manager', date: '08 Nov 2024', duration: '60 mins', company: 'Mock Interview: Stripe', score: 78, type: 'Completed', icon: 'briefcase', tone: 'violet' },
  { role: 'Data Scientist', date: '24 Oct 2024', duration: '30 mins', company: 'Practice Mode', score: 64, type: 'Completed', icon: 'chart', tone: 'cyan' },
  { role: 'Senior Systems Architect', date: '18 Oct 2024', duration: '45 mins', company: 'Technical interview', score: 86, type: 'Favorite', icon: 'spark', tone: 'blue' },
]

function SessionCard({ session }) {
  return <article className="history-session-card"><span className={`history-session-icon ${session.tone}`}><Icon name={session.icon} size={28}/></span><div className="history-session-copy"><h2>{session.role}</h2><div className="history-meta"><span><Icon name="clock" size={14}/>{session.date}</span><span><Icon name="clock" size={14}/>{session.duration}</span><span><Icon name="briefcase" size={14}/>{session.company}</span></div></div><div className="history-score"><strong>{session.score}%</strong><span>Overall score</span></div><div className="history-card-actions"><Link to="/reports" className="button secondary">View details</Link><Link to="/interview" className="button">Retake</Link></div></article>
}

export function History() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All sessions')
  const filteredSessions = useMemo(() => sessions.filter((session) => `${session.role} ${session.company}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All sessions' || session.type === filter)), [query, filter])

  return <div className="history-page"><div className="history-intro"><div><span className="eyebrow">YOUR JOURNEY</span><h1>Interview history</h1><p>Track your evolution as a candidate. Review performance insights from past sessions and see where your skills are trending.</p></div></div><section className="history-overview"><article className="panel trajectory-card"><div className="trajectory-head"><div><h2>Improvement trajectory</h2><p>Average score across your last 10 interviews</p></div><span className="growth-pill">+12% growth</span></div><div className="trajectory-chart"><div className="trajectory-grid"><i/><i/><i/></div><div className="trajectory-bars">{[['Oct 1',60,'muted'],['Oct 12',65,'muted'],['Oct 20',62,'soft'],['Nov 5',78,'violet-soft'],['Nov 14',85,'violet'],['Today',92,'navy']].map(([label,height,tone]) => <div className="trajectory-bar" key={label}><i className={tone} style={{height: `${height}%`}}/><span>{label}</span></div>)}</div></div></article><aside className="history-bento"><article><span>Total prep hours</span><strong>24.5</strong><p>You’re in the top 5% of prepared candidates this week.</p></article><article><span>Main focus</span><strong>System design</strong><p><Icon name="chart" size={14}/> Ready for Tier 1 interviews</p></article></aside></section><div className="history-toolbar"><label className="history-search"><Icon name="search" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by role or company..." /></label><div className="history-filters">{['All sessions','Completed','In Progress','Favorite'].map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div></div><section className="history-list">{filteredSessions.length ? filteredSessions.map((session) => <SessionCard key={`${session.role}-${session.date}`} session={session}/>) : <div className="empty-history"><Icon name="search" size={25}/><h2>No sessions found</h2><p>Try a different role, company, or filter.</p></div>}</section><div className="history-load"><button className="button secondary"><Icon name="arrow" size={15}/> Load previous sessions</button></div></div>
}
