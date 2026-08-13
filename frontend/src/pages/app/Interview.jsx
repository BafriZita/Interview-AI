import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/Button'
import { Tag } from '../../components/UI'
import { navigate } from '../../utils/navigation'

const focusAreas = ['Technical', 'Behavioural', 'Managerial']
const levels = ['Junior', 'Mid-level', 'Senior / Staff']
const modes = ['Voice input', 'Typing only']
const goals = ['Prepare for a specific role', 'Improve one skill', 'Explore a new career path']

const typeToFocus = {
  technical: 'Technical',
  behavioral: 'Behavioural',
  hr: 'HR',
  situational: 'Situational',
  problem_solving: 'Problem solving',
  mixed: 'Mixed',
}

function ChoiceCard({ icon, title, options, selected, onSelect }) {
  return <article className="panel setup-choice-card"><div className="setup-choice-heading"><span><Icon name={icon} size={18} /></span><h2>{title}</h2></div><div className="choice-list">{options.map((option) => <button key={option} className={selected === option ? 'selected' : ''} onClick={() => onSelect(option)}>{option}{selected === option && <Icon name="check" size={16} />}</button>)}</div></article>
}

function ChatMessage({ type, children }) {
  return <div className={`chat-message ${type}`}><span className="chat-avatar">{type === 'ai' ? <Icon name="spark" size={17} /> : 'ME'}</span><div className="chat-bubble">{children}</div></div>
}

function AnalysisBar({ label, value, tone }) {
  return <div className="analysis-row"><span>{label}</span><div className="analysis-track"><i><b style={{ width: `${value}%` }} className={tone || ''} /></i></div><strong>{value}%</strong></div>
}

async function streamChat(url, payload, handlers) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Could not reach the coach.')
  }
  if (!res.body) throw new Error('Streaming is not supported by this browser.')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sep
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      let event = null
      let data = null
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data = line.slice(5).trim()
      }
      if (event && data != null) {
        let payloadData = {}
        try { payloadData = JSON.parse(data) } catch { /* ignore */ }
        handlers[event]?.(payloadData)
      }
    }
  }
}

export function Interview({ sessionId }) {
  const [started, setStarted] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [focus, setFocus] = useState('Technical')
  const [level, setLevel] = useState('Mid-level')
  const [mode, setMode] = useState('Voice input')
  const [goal, setGoal] = useState(goals[0])
  const [targetRole, setTargetRole] = useState('Frontend Developer')
  const [resumeName] = useState(localStorage.getItem('interviewai.resumeName') || '')

  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [liveAnalysis, setLiveAnalysis] = useState(null)
  const [chatLog, setChatLog] = useState([])
  const [error, setError] = useState('')
  const [ending, setEnding] = useState(false)
  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const chatScrollRef = useRef(null)
  const inputRef = useRef(null)

  const question = questions[questionIndex]
  const isDone = questionIndex >= questions.length

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [chatLog, submitting, recording, transcribing])

  const startInterview = async () => {
    setError('')
    setStarted(true)
    setPreparing(true)
    try {
      const res = await fetch('/api/v1/interviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, type: 'mixed', questionCount: 6 }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error?.message || 'Could not start the interview. Please try again.')
      const data = body.data
      setSession(data)
      setQuestions(data.questions || [])
      setQuestionIndex(0)
      const first = data.questions?.[0]
      setChatLog(first
        ? [{ role: 'ai', content: `Hey there — so glad you showed up! Let's get comfortable. You are interviewing for the ${targetRole} role, and I'll be your coach for the next few questions. No pressure, no judgement — just honest help.\n\nLet's begin: ${first.question_text}` }]
        : [{ role: 'ai', content: `Hi! I am your AI interviewer for the ${targetRole} role. Let's begin — answer in your own words and I will help you sharpen it.` }])
      setLiveAnalysis(null)
      setTimeout(() => inputRef.current?.focus(), 150)
    } catch (err) {
      setError(err.message)
      setStarted(false)
    } finally {
      setPreparing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async (id) => {
      setError('')
      setStarted(true)
      setPreparing(true)
      try {
        const res = await fetch(`/api/v1/interviews/${id}`, { credentials: 'include' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error?.message || 'Could not load your interview. Please try again.')
        const data = body.data
        const qs = data.questions || []
        if (cancelled) return
        setSession({ id: data.id })
        if (data.target_role) setTargetRole(data.target_role)
        setQuestions(qs)
        const firstUnanswered = qs.findIndex((q) => !q.answer_text)
        const idx = firstUnanswered === -1 ? 0 : firstUnanswered
        setQuestionIndex(idx)
        setChatLog([
          { role: 'ai', content: `Welcome back. Continuing your ${data.target_role || 'interview'} — let us pick up where you left off.` },
          { role: 'ai', content: qs[idx]?.question_text || 'This interview has no questions yet. Tap "End session" to finish and see your report.' },
        ])
        setLiveAnalysis(null)
        setTimeout(() => inputRef.current?.focus(), 150)
      } catch (err) {
        if (cancelled) return
        setError(err.message)
        setStarted(false)
      } finally {
        if (!cancelled) setPreparing(false)
      }
    }
    if (!sessionId) return
    load(sessionId)
    return () => { cancelled = true }
  }, [sessionId])

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      setError('Microphone access was denied. Enable it in your browser to use voice input, or type your answer instead.')
    }
  }

  const stopRecording = () => {
    const recorder = mediaRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setRecording(false)
    transcribeChunks()
  }

  const transcribeChunks = async () => {
    if (!chunksRef.current.length || !session || !question) return
    setTranscribing(true)
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    try {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      const res = await fetch(`/api/v1/interviews/${session.id}/questions/${question.id}/transcribe`, { method: 'POST', credentials: 'include', body: form })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error?.message || 'Could not transcribe the recording.')
      if (body.data?.transcript) {
        setAnswer((prev) => (prev ? `${prev} ${body.data.transcript}` : body.data.transcript).trim())
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setTranscribing(false)
    }
  }

  const submitAnswer = async () => {
    const text = answer.trim()
    if (!text || submitting || !session || !question) return
    setSubmitting(true)
    setError('')
    setAnswer('')
    setChatLog((prev) => [...prev, { role: 'user', content: text }])

    const isCoachQuestion = /\?\s*$/.test(text)
    const aiIndex = chatLog.length + 1
    let evaluation = null
    let next = null
    let streamed = ''
    const openAIReply = () => {
      setStreaming(true)
      setChatLog((prev) => [...prev, { role: 'ai', content: '' }])
    }
    const streamReply = () => streamChat(`/api/v1/interviews/${session.id}/chat/stream`, {
      message: text,
      evaluation: evaluation ? { overallScore: evaluation.overallScore, feedback: evaluation.feedback } : null,
      nextQuestion: next?.question_text || null,
    }, {
      token: ({ token }) => {
        streamed += token
        const idx = aiIndex
        setChatLog((prev) => {
          const next = prev.slice()
          if (next[idx]) next[idx] = { ...next[idx], content: next[idx].content + token }
          return next
        })
      },
      error: () => {},
    })

    try {
      if (!isCoachQuestion) {
        const res = await fetch(`/api/v1/interviews/${session.id}/questions/${question.id}/answer`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answerText: text, durationSeconds: 0 }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error?.message || 'Could not save your answer. Please try again.')
        evaluation = body.data?.evaluation
        next = questions[questionIndex + 1]
        setLiveAnalysis(evaluation || null)
        setQuestionIndex((i) => i + 1)
      }

      openAIReply()
      let streamFailed = false
      try {
        await streamReply()
      } catch {
        streamFailed = true
      }

      const idx = aiIndex
      const streamedText = streamed.trim()
      if (streamFailed || !streamedText) {
        const fallback = isCoachQuestion
          ? `Happy to help with that! ${evaluation?.feedback || 'Answer in your own words and I will help you sharpen it.'}`
          : `${evaluation?.feedback || 'Answer recorded — nice work.'}${next ? `\n\nNext question: ${next.question_text}` : '\n\nThat was the last question — tap "End session" to finish.'}`
        setChatLog((prev) => {
          const nxt = prev.slice()
          if (idx != null && nxt[idx]) nxt[idx] = { ...nxt[idx], content: fallback }
          return nxt
        })
      } else if (next && !streamedText.endsWith('?') && !streamedText.includes(next.question_text.slice(0, 30))) {
        setTimeout(() => {
          setChatLog((prev) => [...prev, { role: 'ai', content: next.question_text }])
        }, 60)
      }
    } catch (err) {
      setError(err.message)
      setChatLog((prev) => [...prev, { role: 'ai', content: `Sorry, I could not evaluate that: ${err.message}` }])
    } finally {
      setStreaming(false)
      setSubmitting(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    submitAnswer()
  }

  const leaveRoom = async () => {
    if (!session || ending) return
    setEnding(true)
    setError('')
    try {
      await fetch(`/api/v1/interviews/${session.id}/complete`, { method: 'POST', credentials: 'include' }).catch(() => {})
    } finally {
      navigate(`/feedback/${session.id}`)
    }
  }

  if (!started) return <div className="interview-page interview-setup-page"><div className="interview-setup-heading"><span className="eyebrow">MOCK INTERVIEW</span><h1>Set up your interview</h1><p>Tailor the coach to your specific career goals.</p></div><div className="setup-choice-grid"><ChoiceCard icon="chart" title="Focus area" options={focusAreas} selected={focus} onSelect={setFocus} /><ChoiceCard icon="chart" title="Level" options={levels} selected={level} onSelect={setLevel} /><ChoiceCard icon="mic" title="Interview mode" options={modes} selected={mode} onSelect={setMode} /></div>{resumeName && <div className="resume-context-banner"><span><Icon name="file" size={18} /></span><div><b>{resumeName}</b><small>Connected — questions will be personalised to your resume.</small></div></div>}<section className="panel setup-goal"><div className="setup-goal-copy"><span className="setup-label">What do you want to work on?</span><h2>Make this session useful for you.</h2><p>Choose a goal and target role so every question feels relevant.</p><div className="goal-options">{goals.map((item) => <button className={goal === item ? 'selected' : ''} key={item} onClick={() => setGoal(item)}>{item}{goal === item && <Icon name="check" size={15} />}</button>)}</div></div><label className="target-role"><span>Target role</span><div><Icon name="briefcase" size={17} /><input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} /></div></label></section>{error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}<div className="setup-action"><Button onClick={startInterview} endIcon="arrow">Enter interview room</Button></div></div>

  if (preparing) return <div className="interview-live-page interview-loading"><span className="spinner" /><h2>Preparing your interview…</h2><p>The AI coach is building questions around {targetRole}.</p></div>

  const analysis = liveAnalysis?.scores || {}
  const clarity = analysis.clarity ?? 0
  const confidence = analysis.confidence ?? 0
  const overall = liveAnalysis?.overallScore ?? null

  return <div className="interview-live-page">
    <header className="live-session-header"><div><h1>{targetRole}</h1><div className="live-session-meta"><span className="live-dot" /> <b>Live session</b><span>·</span><span>{isDone ? 'Finished' : `Question ${Math.min(questionIndex + 1, questions.length)} of ${questions.length}`}</span></div></div><div className="live-session-actions"><button className="ghost-btn" onClick={() => { setStarted(false); setError('') }}>New interview</button><Button onClick={leaveRoom} endIcon="close" disabled={ending}>{ending ? 'Ending…' : 'End session'}</Button></div></header>

    <div className="interview-chat">
      <section className="chat-pane">
        <div className="chat-thread" ref={chatScrollRef}>
          {chatLog.map((m, i) => <ChatMessage type={m.role} key={i}><p className="chat-text">{m.content}</p></ChatMessage>)}
          {submitting && !streaming && <ChatMessage type="ai"><div className="ai-thinking"><span className="spinner" /> Analysing your answer…</div></ChatMessage>}
        </div>
        <form className="chat-controls" onSubmit={handleSend}>
          {(recording || transcribing) && <div className="transcript-preview"><span className="live-dot" /> {recording ? 'Listening — speak clearly' : 'Transcribing your speech…'}<span className="transcript-echo">{answer}</span></div>}
          {error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}
          <div className="chat-input-row">
            <input ref={inputRef} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your response or speak…" disabled={submitting || !question || isDone} />
            {mode !== 'Typing only' && <button type="button" className={`live-mic${recording ? ' active' : ''}`} onClick={() => (recording ? stopRecording() : startRecording())} disabled={transcribing || submitting || !question || isDone} aria-label={recording ? 'Stop and transcribe' : 'Start microphone'}><Icon name={recording ? 'close' : 'mic'} size={22} /><i /></button>}
            <button type="submit" className="send-btn" disabled={submitting || !answer.trim() || !question || isDone} aria-label="Send answer"><Icon name="arrow" size={17} /></button>
          </div>
        </form>
      </section>

      <aside className="chat-sidebar">
        <section className="panel sidebar-card">
          <div className="sidebar-card-head"><h3>Resume context</h3><Icon name="check" size={16} /></div>
          {resumeName
            ? <div className="sidebar-resume"><span className="file-thumb"><Icon name="file" size={19} /></span><div><b>{resumeName}</b><small>Connected to this session</small></div></div>
            : <p className="sidebar-muted">No resume connected yet — questions stay generic.</p>}
        </section>
        <section className="panel sidebar-card">
          <div className="sidebar-card-head"><h3>Current focus</h3></div>
          <div className="focus-chips"><Tag tone="violet">{typeToFocus[question?.question_type] || focus}</Tag><Tag>{level}</Tag><Tag>Mock interview</Tag></div>
        </section>
        <section className="panel sidebar-card">
          <div className="sidebar-card-head"><h3>Live analysis</h3>{overall != null && <Tag tone={overall >= 75 ? 'green' : 'orange'}>{overall}%</Tag>}</div>
          <AnalysisBar label="Clarity" value={clarity} />
          <AnalysisBar label="Confidence" value={confidence} />
          {liveAnalysis?.coachHint ? <div className="ai-hint"><span><Icon name="spark" size={15} /></span><div><b>AI hint</b><p>{liveAnalysis.coachHint}</p></div></div> : <p className="sidebar-muted">Answer a question to see live feedback.</p>}
        </section>
      </aside>
    </div>
  </div>
}
