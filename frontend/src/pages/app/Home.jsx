import { useEffect, useState } from 'react'
import { Link } from '../../components/Link'
import { Icon } from '../../components/Icon'
import { PageHeader, Progress, Tag } from '../../components/UI'
import { api } from '../../utils/api'

function getDashboardName() {
  try {
    const storedUser = JSON.parse(localStorage.getItem('interviewai.user') || '{}')
    const name = storedUser.username || storedUser.fullName || localStorage.getItem('interviewai.username')
    return name?.trim()?.split(' ')[0] || 'Zita'
  } catch {
    return 'Zita'
  }
}

function NewUserDashboard({ name, onComplete }) {
  return <>
    <PageHeader eyebrow="GET STARTED" title={`Hello, ${name}`} text="Let us set up your interview workspace so your practice, resume, and feedback feel personal from the first session." action={<Link to="/resume" className="button" onClick={onComplete}>Upload resume <Icon name="arrow" size={16} /></Link>} />
    <section className="dashboard-summary">
      <article className="panel recent-session">
        <div className="session-head">
          <div><Tag tone="green">First step</Tag><h2>Build your interview profile</h2><p>Add your resume and target role so your practice questions match your actual goals.</p></div>
          <div className="session-score"><strong>0</strong><span>Sessions</span></div>
        </div>
        <div className="metric-row">
          <div><span>Resume</span><Progress value={15} /><b>Start</b></div>
          <div><span>Target role</span><Progress value={0} color="cyan" /><b>Pending</b></div>
          <div><span>Practice</span><Progress value={0} color="violet" /><b>Ready</b></div>
        </div>
      </article>
      <article className="panel velocity-card">
        <div className="panel-head"><h2>Today&apos;s setup</h2><Tag>New</Tag></div>
        <div className="quick-actions compact">
          <Link to="/resume" className="quick-action" onClick={onComplete}><span className="quick-icon blue"><Icon name="upload" /></span><strong>Upload resume</strong><Icon name="arrow" size={16} /></Link>
          <Link to="/interview" className="quick-action" onClick={onComplete}><span className="quick-icon violet"><Icon name="mic" /></span><strong>Start interview</strong><Icon name="arrow" size={16} /></Link>
        </div>
      </article>
    </section>
    <section className="dashboard-columns">
      <div className="quick-actions">
        <h2>Recommended next steps</h2>
        <Link to="/profile" className="quick-action" onClick={onComplete}><span className="quick-icon blue"><Icon name="user" /></span><strong>Complete personal information</strong><Icon name="arrow" size={16} /></Link>
        <Link to="/job-description" className="quick-action" onClick={onComplete}><span className="quick-icon cyan"><Icon name="briefcase" /></span><strong>Add target job</strong><Icon name="arrow" size={16} /></Link>
        <Link to="/interview" className="quick-action" onClick={onComplete}><span className="quick-icon violet"><Icon name="mic" /></span><strong>Try your first mock interview</strong><Icon name="arrow" size={16} /></Link>
      </div>
      <div className="recent-activity">
        <div className="section-row"><h2>What happens next</h2></div>
        <div className="activity-card">
          {[
            ['file', 'Upload your resume', 'We use it to understand your skills and experience.', 'Step 1', 'navy'],
            ['briefcase', 'Choose a role', 'Your questions become more relevant to the job you want.', 'Step 2', 'cyan'],
            ['chart', 'Get feedback', 'After each session, your feedback page shows strengths and gaps.', 'Step 3', 'violet'],
          ].map(([icon, title, text, time, tone]) => <div className="activity-item" key={title}><span className={`activity-dot ${tone}`}><Icon name={icon} size={14} /></span><div><h3>{title}</h3><p>{text}</p></div><time>{time}</time></div>)}
        </div>
      </div>
    </section>
  </>
}

export function Home() {
  const [isNewUser, setIsNewUser] = useState(() => localStorage.getItem('interviewai.dashboardSeen') !== 'true')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const completeFirstVisit = () => {
    localStorage.setItem('interviewai.dashboardSeen', 'true')
    setIsNewUser(false)
  }

  useEffect(() => {
    (async () => {
      try {
        const d = await api('/api/v1/dashboard')
        setData(d)
        if (d?.summary?.interviews_completed > 0) setIsNewUser(false)
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [])

  if (isNewUser && data?.summary?.interviews_completed === 0) {
    return <NewUserDashboard name={getDashboardName()} onComplete={completeFirstVisit} />
  }

  const summary = data?.summary
  const recent = data?.recent || []
  const last = recent.find((r) => r.status === 'completed') || recent[0]

  return <>
    <PageHeader eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()} title={`Hello, ${getDashboardName()}`} text={summary?.interviews_completed ? `You have completed ${summary.interviews_completed} interview${summary.interviews_completed === 1 ? '' : 's'} with an average score of ${summary.average_score ?? '—'}%.` : 'Ready to level up today?'} action={<Link to="/interview" className="button">Continue interview <Icon name="arrow" size={16} /></Link>} />
    {error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}
    <section className="dashboard-summary">
      <article className="panel recent-session ai-gradient-border">
        <div className="session-head">
          <div><Tag tone="violet">Last session</Tag><h2>{last ? last.target_role : 'No sessions yet'}</h2><p>{last ? `${last.interview_type} interview · ${last.status}` : 'Start your first interview to see your results here.'}</p></div>
          <div className="session-score"><strong>{summary?.interviews_completed ?? 0}</strong><span>Completed sessions</span></div>
        </div>
        <div className="metric-row">
          <div><span>Average score</span><Progress value={summary?.average_score ?? 0} color="violet" /><b>{summary?.average_score ?? '—'}%</b></div>
          <div><span>Best effort</span><Progress value={Math.max(0, ...(data?.recent || []).map((r) => r.overall_score || 0))} color="cyan" /><b>{Math.max(0, ...(data?.recent || []).map((r) => r.overall_score || 0))}%</b></div>
          <div><span>Feedback</span><Progress value={summary?.average_score ?? 0} /><b>Ready</b></div>
        </div>
      </article>
      <article className="panel velocity-card">
        <div className="panel-head"><h2>Quick actions</h2><Tag>{recent.length} recent</Tag></div>
        <div className="quick-actions compact">
          <Link to="/interview" className="quick-action"><span className="quick-icon violet"><Icon name="mic" /></span><strong>New interview</strong><Icon name="arrow" size={16} /></Link>
          <Link to="/history" className="quick-action"><span className="quick-icon blue"><Icon name="clock" /></span><strong>View history</strong><Icon name="arrow" size={16} /></Link>
          <Link to="/resume" className="quick-action"><span className="quick-icon cyan"><Icon name="upload" /></span><strong>Update resume</strong><Icon name="arrow" size={16} /></Link>
        </div>
      </article>
    </section>
    <section className="dashboard-columns">
      <div className="quick-actions">
        <h2>Recommended next steps</h2>
        <Link to="/interview" className="quick-action"><span className="quick-icon violet"><Icon name="mic" /></span><strong>Practise with voice input</strong><Icon name="arrow" size={16} /></Link>
        <Link to="/feedback" className="quick-action"><span className="quick-icon cyan"><Icon name="chart" /></span><strong>Review your reports</strong><Icon name="arrow" size={16} /></Link>
      </div>
      <div className="recent-activity">
        <div className="section-row"><h2>Recent sessions</h2><Link to="/history">View all</Link></div>
        <div className="activity-card">
          {recent.length === 0 && <div className="activity-item"><span className="activity-dot navy"><Icon name="mic" size={14} /></span><div><h3>No sessions yet</h3><p>Complete your first interview to see activity here.</p></div><time>Now</time></div>}
          {recent.slice(0, 5).map((s) => <div className="activity-item" key={s.id}><span className={`activity-dot ${s.status === 'completed' ? 'violet' : 'cyan'}`}><Icon name={s.status === 'completed' ? 'chart' : 'mic'} size={14} /></span><div><h3>{s.target_role}</h3><p>{s.status === 'completed' ? `Score ${s.overall_score ?? '—'}%` : 'In progress'}</p></div><time>{new Date(s.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</time></div>)}
        </div>
      </div>
    </section>
  </>
}
