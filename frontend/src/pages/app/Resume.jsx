import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { PageHeader, Progress, Tag, UploadBox } from '../../components/UI'
import { api, apiUpload } from '../../utils/api'

export function Resume() {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploaded, setUploaded] = useState(null)
  const [resumes, setResumes] = useState([])
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const rows = await api('/api/v1/resumes')
      setResumes(rows || [])
      if (rows?.length) {
        const primary = rows.find((r) => r.is_primary) || rows[0]
        const detail = await api(`/api/v1/resumes/${primary.id}`)
        setInsights(detail.insights || [])
        localStorage.setItem('interviewai.resumeName', primary.original_name)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { (async () => { await load() })() }, [])

  const uploadResume = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const result = await apiUpload('/api/v1/resumes', 'resume', file)
      setUploaded(result)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (event.target) event.target.value = ''
    }
  }

  const primary = resumes.find((r) => r.is_primary) || resumes[0]

  return <>
    <PageHeader eyebrow="YOUR PROFESSIONAL STORY" title="Resume intelligence" text="Upload your CV and let AI turn it into insights, scores and career paths." action={<button className="button" onClick={() => inputRef.current?.click()} disabled={uploading}><Icon name="upload" /> {uploading ? 'Analysing…' : 'Upload new resume'}</button>} />
    <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={uploadResume} />
    {error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}
    {uploading && <div className="loading-row"><i className="spinner" /> Uploading and analysing with AI…</div>}
    <div className="two-col">
      <section className="panel">
        <h2>Resume document</h2>
        <UploadBox onChoose={() => inputRef.current?.click()} />
        {primary && <div className="file-card"><span>{primary.original_name.endsWith('.pdf') ? 'PDF' : 'CV'}</span><div><strong>{primary.original_name}</strong><small>{primary.status === 'ready' ? 'Analysed by AI' : 'Could not read — try PDF or DOCX'}</small></div><b>{primary.status === 'ready' ? '✓' : '!'}</b></div>}
        {uploaded?.aiEnabled === false && <p className="ai-warning"><Icon name="spark" size={14} /> Add an OPENAI_API_KEY to your backend .env for full AI analysis.</p>}
      </section>
      <section className="panel score-panel">
        <span className="eyebrow">RESUME STRENGTH</span>
        {primary ? <>
          <div className="big-score"><strong>{primary.strength_score ?? '—'}</strong><span>/100</span></div>
          <Progress value={primary.strength_score ?? 0} />
          <p><b>{primary.strength_score >= 80 ? 'Strong foundation.' : primary.strength_score >= 60 ? 'Good base.' : 'Room to grow.'}</b> {insights.length ? 'Targeted suggestions are below.' : 'Upload a PDF or DOCX to unlock AI suggestions.'}</p>
        </> : <>
          <div className="big-score"><strong>—</strong><span>/100</span></div>
          <Progress value={0} />
          <p><b>Upload your resume</b> to get an honest strength score and improvement plan.</p>
        </>}
      </section>
    </div>

    {loading && <div className="loading-row"><i className="spinner" /> Loading analysis…</div>}

    {primary && insights.length > 0 && <>
      <div className="analysis-grid">
        <section className="panel span-2 suggestions">
          <h2>AI improvement suggestions</h2>
          {insights.map((s) => <div key={s.title}><span><Icon name="spark" /></span><p><strong>{s.title}</strong><small>{s.description}</small></p><Tag tone={s.metadata?.priority === 'High' ? 'orange' : ''}>{s.metadata?.priority || 'Medium'}</Tag></div>)}
        </section>
      </div>
    </>}

    {!loading && resumes.length > 0 && <section className="panel">
      <div className="panel-head"><h2>All resumes</h2><Tag>{resumes.length}</Tag></div>
      {resumes.map((r) => <div className="file-card" key={r.id}><span>{r.original_name.endsWith('.pdf') ? 'PDF' : 'CV'}</span><div><strong>{r.original_name}</strong><small>{new Date(r.created_at).toLocaleDateString()} {r.is_primary ? '· Primary' : ''}</small></div><b>{r.status === 'ready' ? '✓' : '!'}</b></div>)}
    </section>}
  </>
}
