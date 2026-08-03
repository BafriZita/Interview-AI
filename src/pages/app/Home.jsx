import { Link } from '../../components/Link'
import { Icon } from '../../components/Icon'
import { PageHeader, Progress, Tag } from '../../components/UI'

const activity = [
  ['chart', 'Resume analysis complete', "Identified 4 keywords to add for 'Google L6' fit.", '2h ago', 'violet'],
  ['mic', 'Interview finished', 'Senior Systems Architect session saved.', '5h ago', 'navy'],
  ['spark', 'New report available', 'Weekly progress summary for 28 Jul–03 Aug.', 'Yesterday', 'cyan'],
  ['settings', 'Account security update', 'Password was successfully changed.', '3d ago', 'muted'],
]

export function Home() {
  return <>
    <PageHeader eyebrow="MONDAY, 3 AUGUST" title="Welcome back, Alex" text="You’re in the top 15% of candidates preparing for Senior Product roles. Ready to level up today?" action={<Link to="/interview" className="button">Continue interview <Icon name="arrow" size={16}/></Link>}/>
    <section className="dashboard-summary">
      <article className="panel recent-session ai-gradient-border"><div className="session-head"><div><Tag tone="violet">Last session</Tag><h2>Senior Systems Architect</h2><p>45 min session · 12 behavioural questions analysed</p></div><div className="session-score"><strong>88</strong><span>Overall score</span></div></div><div className="metric-row"><div><span>Confidence</span><Progress value={92} color="violet"/><b>92%</b></div><div><span>Technical depth</span><Progress value={84} color="cyan"/><b>84%</b></div><div><span>Clarity</span><Progress value={78}/><b>78%</b></div></div></article>
      <article className="panel velocity-card"><div className="panel-head"><h2>Prep velocity</h2><Tag>7 days</Tag></div><div className="velocity-bars">{[40,65,50,85,95,75,60].map((height, index) => <i key={index} className={index === 4 ? 'highlight' : index === 5 ? 'navy-bar' : ''} style={{height: `${height}%`}} />)}</div><div className="velocity-labels"><span>Mon</span><span>Today</span><span>Sun</span></div></article>
    </section>
    <section className="dashboard-columns"><div className="quick-actions"><h2>Quick actions</h2><Link to="/resume" className="quick-action"><span className="quick-icon blue"><Icon name="upload"/></span><strong>Upload resume</strong><Icon name="arrow" size={16}/></Link><Link to="/history" className="quick-action"><span className="quick-icon violet"><Icon name="clock"/></span><strong>View history</strong><Icon name="arrow" size={16}/></Link><Link to="/reports" className="quick-action"><span className="quick-icon cyan"><Icon name="chart"/></span><strong>Review reports</strong><Icon name="arrow" size={16}/></Link></div><div className="recent-activity"><div className="section-row"><h2>Recent activity</h2><Link to="/history">View all</Link></div><div className="activity-card">{activity.map(([icon, title, text, time, tone]) => <div className="activity-item" key={title}><span className={`activity-dot ${tone}`}><Icon name={icon} size={14}/></span><div><h3>{title}</h3><p>{text}</p></div><time>{time}</time></div>)}</div></div></section>
    <section className="dashboard-bottom"><article className="panel next-step"><div><span className="eyebrow">NEXT BEST STEP</span><h2>Strengthen your technical depth.</h2><p>Answer three focused technical questions to move your readiness score from 84% to the next level.</p><Link to="/recommendations" className="text-link">View recommendations <Icon name="arrow" size={14}/></Link></div><div className="next-ring"><strong>84<small>%</small></strong><span>Job readiness</span></div></article></section>
  </>
}
