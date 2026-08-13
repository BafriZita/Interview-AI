import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/Button'
import { Link } from '../../components/Link'
import { PageHeader, Tag } from '../../components/UI'
import { api } from '../../utils/api'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(seconds) {
  const s = Number(seconds)
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}m ${sec}s`
}

const skillLabels = { clarity: 'Clarity', communication: 'Communication', confidence: 'Confidence', technical_depth: 'Technical depth' }

function SkillBars({ skillScores }) {
  if (!skillScores) return null
  const rows = Object.entries(skillScores).filter(([k]) => skillLabels[k])
  return <div className="fb-bars">
    {rows.map(([key, value]) => <div className="fb-bar" key={key}><span>{skillLabels[key]}<b>{value}%</b></span><div className="fb-bar-track"><i style={{ width: `${value}%` }} /></div></div>)}
  </div>
}

function MiniRing({ value, label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  return <div className="fb-miniring">
    <svg viewBox="0 0 36 36">
      <path className="fb-miniring-track" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
      <path className="fb-miniring-fill" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray={`${v}, 100`} strokeLinecap="round" strokeWidth="3" />
    </svg>
    <strong>{v}{label ? <span>{label}</span> : null}</strong>
  </div>
}

export function Reports() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/api/v1/reports')
        setSessions(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return <>
    <PageHeader eyebrow="PERFORMANCE" title="Feedback" text="Honest reviews of every completed interview, ready to download and learn from." />
    {error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}
    {loading && <div className="loading-row"><i className="spinner" /> Loading reports…</div>}
    {!loading && !error && sessions.length === 0 && <div className="panel empty-history"><Icon name="chart" size={26} /><h2>No completed interviews yet</h2><p>Finish your first interview to unlock an honest, personalised report.</p><Link to="/interview" className="button">Start an interview</Link></div>}
    {!loading && sessions.length > 0 && <section className="reports-list">
      {sessions.map((s) => (
        <article className="panel report-list-card" key={s.id}>
          <span className="report-list-icon"><Icon name="chart" size={24} /></span>
          <div className="report-list-copy">
            <h2>{s.target_role} interview</h2>
            <div className="report-meta"><span><Icon name="clock" size={14} /> {formatDate(s.completed_at)}</span><Tag tone={s.overall_score >= 75 ? 'green' : s.overall_score >= 50 ? 'orange' : 'red'}>{s.overall_score >= 75 ? 'Strong' : s.overall_score >= 50 ? 'Improving' : 'Needs work'}</Tag></div>
          </div>
          <div className="history-score"><strong>{s.overall_score ?? '—'}%</strong><span>Overall score</span></div>
          <Link to={`/feedback/${s.id}`} className="button secondary">View report</Link>
        </article>
      ))}
    </section>}
  </>
}

export function ReportDetail({ sessionId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shared, setShared] = useState(false)

  const load = useCallback(async () => {
    try {
      const report = await api(`/api/v1/reports/${sessionId}`)
      setData(report)
      setError('')
      return report
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [sessionId])

  useEffect(() => {
    let cancelled = false
    let timer = null
    ;(async () => {
      const res = await load()
      setLoading(false)
      if (!cancelled && res && res.generating && !res.report) {
        timer = setInterval(async () => {
          const next = await load()
          if (cancelled) return
          if (!next || (!next.generating && next.report)) clearInterval(timer)
        }, 2500)
      }
    })()
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [load])

  const downloadReport = () => {
    if (!data) return
    const { session, report } = data
    const lines = [
      `INTERVIEWAI — INTERVIEW REPORT`,
      `================================`,
      ``,
      `Target role: ${session.target_role}`,
      `Interview type: ${session.interview_type}`,
      `Completed: ${formatDate(session.completed_at)}`,
      `Overall score: ${report?.overallScore ?? session.overall_score ?? '—'} / 100`,
      ``,
      `SUMMARY`,
      report?.summary || 'No summary available.',
      ``,
      `STRENGTHS`,
      ...(report?.strengths || []).map((s) => `  • ${s}`),
      ``,
      `AREAS FOR IMPROVEMENT`,
      ...(report?.improvements || []).map((s) => `  • ${s}`),
      ``,
      `SOLUTIONS & NEXT STEPS`,
      ...(report?.solutions || []).map((s) => `  • ${s}`),
      ``,
      `QUESTION-BY-QUESTION`,
      ...(data.answers || []).map((a, i) => `${i + 1}. ${a.question_text}\n   Score: ${a.overall_score ?? '—'}/100\n   Answer: ${a.answer_text || '(no answer)'}\n   Feedback: ${a.feedback || ''}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview-report-${session.id || sessionId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareReport = async () => {
    if (!data) return
    const text = `InterviewAI report — ${data.session.target_role} interview (${report.overallScore ?? session.overall_score ?? '—'}/100). ${report.summary || ''}`
    try {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      setShared(false)
    }
  }

  if (loading) return <div className="loading-row"><i className="spinner" /> Loading your report…</div>
  if (error) return <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>
  if (!data) return null

  const { session, report, answers } = data
  const answerScores = (answers || []).map((a) => a.overall_score).filter((v) => v != null)
  const avgFromAnswers = answerScores.length ? Math.round(answerScores.reduce((a, b) => a + b, 0) / answerScores.length) : null
  const score = report?.overallScore ?? session.overall_score ?? avgFromAnswers ?? 0
  const noInterview = !(answers || []).length && report?.overallScore == null && session.overall_score == null
  const strengths = report?.strengths || []
  const improvements = report?.improvements || []
  const solutions = report?.solutions || []
  const skillScores = report?.skillScores || {}
  const communication = skillScores.communication ?? score
  const confidence = skillScores.confidence ?? score
  const confidenceLabel = noInterview ? '—' : confidence >= 75 ? 'High' : confidence >= 55 ? 'Mid' : 'Low'
  const timeTaken = formatTime(answers.reduce((acc, a) => acc + (Number(a.duration_seconds) || 0), 0))
  const ringOffset = Math.round(283 - (score / 100) * 283)
  const analysing = data.generating && !report

  const solutionBlocks = answers.length
    ? answers.filter((a) => a.answer_text).slice(0, 4).map((a, i) => {
        const strategy = a.coach_hint || a.feedback || solutions[i % solutions.length] || 'Weave one concrete example and a measurable result into this answer.'
        const snippet = a.answer_text.length > 140 ? `${a.answer_text.slice(0, 140)}…` : a.answer_text
        return { question: a.question_text, snippet, strategy }
      })
    : solutions.slice(0, 4).map((s, i) => ({ question: `Solution ${i + 1}`, snippet: '', strategy: s }))

  return (
    <div className="fb-page">
      {analysing && <div className="fb-analysing-banner"><i className="spinner" /> <span>Analysing your interview — your full report is being prepared and will appear here automatically.</span></div>}
      <section className="fb-hero">
        <article className="fb-glass fb-score-card">
          <span className="eyebrow">Overall score</span>
          <div className="fb-score-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="transparent" strokeWidth="8" className="fb-ring-track" />
              <circle cx="50" cy="50" r="45" fill="transparent" strokeWidth="8" strokeLinecap="round" className="fb-ring-fill" style={{ ['--offset']: ringOffset, strokeDashoffset: ringOffset, strokeDasharray: 283 }} />
            </svg>
            <div className="fb-ring-label"><strong>{score || '—'}</strong><span>out of 100</span></div>
          </div>
          <p>{report?.summary || (avgFromAnswers != null ? `Based on ${answers.length} evaluated answers, your average score is ${avgFromAnswers}/100.` : 'Honest feedback on how your interview went.')}</p>
        </article>
        <article className="fb-meta">
          <div>
            <h1>{session.target_role} interview</h1>
            <div className="fb-tags"><Tag tone={noInterview ? 'cyan' : score >= 75 ? 'violet' : score >= 50 ? 'orange' : 'red'}>{noInterview ? 'No interview recorded' : score >= 75 ? 'High performance' : score >= 50 ? 'Building momentum' : 'Needs focus'}</Tag><Tag tone="cyan">{formatDate(session.completed_at)}</Tag></div>
            <p>{noInterview ? 'No answers were recorded for this session, so there is no score to show yet. Complete an interview to get an honest, scored review.' : `${answers.length} questions evaluated · ${session.interview_type} interview. ${score >= 75 ? 'Honest AI analysis says you performed strongly, with a few refinements worth practising.' : 'Honest AI analysis shows clear areas to sharpen before your next session.'}`}</p>
          </div>
          <div className="fb-actions">
            <Button onClick={downloadReport} endIcon="download">Download report</Button>
            <Button onClick={shareReport} endIcon="share" variant="secondary">{shared ? 'Copied!' : 'Share results'}</Button>
          </div>
        </article>
      </section>

      <section className="fb-bento">
        <article className="fb-glass fb-skill-card">
          <div className="fb-card-head"><h3>Skill breakdown</h3><Tag tone="cyan">AI analysis</Tag></div>
          {noInterview ? <p className="sidebar-muted">No answers recorded — there is nothing to score yet.</p> : Object.keys(skillScores).length ? <SkillBars skillScores={skillScores} /> : <p className="sidebar-muted">Skill scores will appear once the full analysis is ready.</p>}
        </article>
        <article className="fb-glass fb-comm-card">
          <h3>Communication</h3>
          <MiniRing value={noInterview ? null : communication} label="%" />
          <p>{noInterview ? 'No answers recorded — there is nothing to score yet.' : communication >= 80 ? 'Clear articulation with strong flow.' : communication >= 55 ? 'Readable, but structure it to land harder.' : 'Needs more structure and specifics.'}</p>
        </article>
        <div className="fb-minis">
          <article className="fb-glass fb-mini">
            <span className="fb-mini-icon violet"><Icon name="spark" size={18} /></span>
            <div><span>Confidence level</span><strong>{confidenceLabel}</strong></div>
          </article>
          <article className="fb-glass fb-mini">
            <span className="fb-mini-icon"><Icon name="clock" size={18} /></span>
            <div><span>Time taken</span><strong>{timeTaken}</strong></div>
          </article>
        </div>
      </section>

      <section className="fb-qual">
        <div className="fb-list-col">
          <article className="fb-glass fb-strengths">
            <h4><Icon name="chart" size={16} /> Strengths</h4>
            <ul>{strengths.length ? strengths.map((item) => <li key={item}><Icon name="check" size={15} />{item}</li>) : <li>{analysing ? 'Being analysed…' : 'No strengths captured.'}</li>}</ul>
          </article>
          <article className="fb-glass fb-improvements">
            <h4><Icon name="spark" size={16} /> Areas for improvement</h4>
            <ul>{improvements.length ? improvements.map((item) => <li key={item}><Icon name="arrow" size={15} />{item}</li>) : <li>{analysing ? 'Being analysed…' : 'No areas captured.'}</li>}</ul>
          </article>
        </div>
        <article className="fb-solutions">
          <div className="fb-solutions-head"><Icon name="spark" size={18} /><h3>AI-Enhanced Solutions</h3></div>
          <div className="fb-solution-list">
            {solutionBlocks.map((b, i) => (
              <div className="fb-solution-block" key={i}>
                <h5>{b.question}</h5>
                {b.snippet && <p className="fb-snippet">Your answer focused on: “{b.snippet}”</p>}
                <div className="fb-strategy"><span>Better answer strategy:</span><p>{b.strategy}</p></div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {answers.length > 0 && <section className="report-qa">
        <div className="panel-head"><h2>Question-by-question</h2><Tag>{answers.length} questions</Tag></div>
        <div className="qa-list">
          {answers.map((a, i) => (
            <article className="panel qa-item" key={i}>
              <div className="qa-head"><h3>{i + 1}. {a.question_text}</h3>{a.overall_score != null && <Tag tone={a.overall_score >= 75 ? 'green' : 'orange'}>{a.overall_score}/100</Tag>}</div>
              {a.answer_text && <p className="qa-answer"><b>Your answer:</b> {a.answer_text}</p>}
              {a.feedback && <p className="qa-feedback"><b>Feedback:</b> {a.feedback}</p>}
            </article>
          ))}
        </div>
      </section>}
    </div>
  )
}
