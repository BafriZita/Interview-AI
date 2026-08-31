import { useEffect, useRef, useState, useCallback } from 'react'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/Button'
import { Tag } from '../../components/UI'
import { navigate } from '../../utils/navigation'
import { useSpeech } from '../../utils/useSpeech'
import { useSpeechRecognition } from '../../utils/useSpeechRecognition'

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

function ChatMessage({ type, children, onSpeak, speaking, canSpeak }) {
  return <div className={`chat-message ${type}`}><span className="chat-avatar">{type === 'ai' ? <Icon name="spark" size={17} /> : 'ME'}</span><div className="chat-bubble">{children}{type === 'ai' && canSpeak && <button type="button" className="speak-btn" onClick={onSpeak} title={speaking ? 'Stop reading' : 'Read aloud'} aria-label={speaking ? 'Stop reading' : 'Read aloud'}><Icon name={speaking ? 'close' : 'mic'} size={14} /></button>}</div></div>
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
        if (event === 'error') {
          handlers.error?.(new Error(payloadData.message || 'Stream error'))
        } else {
          handlers[event]?.(payloadData)
        }
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
  const [transcribing, setTranscribing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [liveAnalysis, setLiveAnalysis] = useState(null)
  const [chatLog, setChatLog] = useState([])
  const [error, setError] = useState('')
  const [ending, setEnding] = useState(false)
  const [voice, setVoice] = useState('nova')
  const [language, setLanguage] = useState('en')
  const chatScrollRef = useRef(null)
  const inputRef = useRef(null)
  const { speak, stop: stopSpeak, speaking } = useSpeech()
  const onSpeechResult = useCallback((text) => { setAnswer(text) }, [])
  const onSpeechEnd = useCallback((finalText) => { setTranscribing(false); if (finalText) setTimeout(() => inputRef.current?.focus(), 50) }, [])
  const { start: startListening, stop: stopListening, listening } = useSpeechRecognition({ onResult: onSpeechResult, onEnd: onSpeechEnd })

  // Load voice and language from user settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem('interviewai.user')
      if (stored) {
        const user = JSON.parse(stored)
        if (user.settings?.preferences?.voice) setVoice(user.settings.preferences.voice)
        if (user.settings?.preferences?.language) setLanguage(user.settings.preferences.language)
      }
    } catch { /* ignore */ }
  }, [])

  const question = questions[questionIndex]
  const isDone = questionIndex >= questions.length

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [chatLog, submitting, listening, transcribing])

  const startInterview = async () => {
    setError('')
    setStarted(true)
    setPreparing(true)
    try {
      const res = await fetch('/api/v1/interviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, type: 'mixed', questionCount: 6, level }),
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

  const startRecording = () => {
    setError('')
    setAnswer('')
    setTranscribing(true)
    startListening()
  }

  const stopRecording = () => {
    setTranscribing(false)
    stopListening()
  }

  const submitAnswer = async () => {
    const text = answer.trim()
    if (!text || submitting || !session || !question) return
    setSubmitting(true)
    setError('')
    setAnswer('')
    
    // Add user message to chat log first
    const newChatLog = [...chatLog, { role: 'user', content: text }]
    setChatLog(newChatLog)

    const isCoachQuestion = /\?\s*$/.test(text)
    let evaluation = null
    let next = null

    const openAIReply = () => {
      setStreaming(true)
      setChatLog((prev) => [...prev, { role: 'ai', content: '' }])
    }

    const streamReply = (evalData, nextQ, messagesToSend) => streamChat(`/api/v1/interviews/${session.id}/chat/stream`, {
      message: text,
      evaluation: evalData ? { overallScore: evalData.overallScore, feedback: evalData.feedback } : null,
      nextQuestion: nextQ?.question_text || null,
      chatLog: messagesToSend,
    }, {
      token: ({ token }) => {
        setChatLog((prev) => {
          const next = prev.slice()
          const idx = next.length - 1
          if (next[idx] && next[idx].role === 'ai') {
            next[idx] = { ...next[idx], content: next[idx].content + token }
          }
          return next
        })
      },
      error: (err) => {
        console.error('Stream error:', err)
        setError(err?.message || 'Stream failed')
      },
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

      // Stream AI response with full chat history
      openAIReply()
      let streamFailed = false
      try {
        // Send the chat log including the new user message
        await streamReply(evaluation, next, newChatLog)
      } catch {
        streamFailed = true
      }

      if (streamFailed) {
        const fallback = isCoachQuestion
          ? `Happy to help with that! ${evaluation?.feedback || 'Answer in your own words and I will help you sharpen it.'}`
          : `${evaluation?.feedback || 'Answer recorded — nice work.'}`
        setChatLog((prev) => {
          const nxt = prev.slice()
          const idx = nxt.length - 1
          if (nxt[idx] && nxt[idx].role === 'ai') {
            nxt[idx] = { ...nxt[idx], content: fallback }
          }
          return nxt
        })
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
            {chatLog.map((m, i) => <ChatMessage type={m.role} key={i} canSpeak={m.role === 'ai' && !!m.content} speaking={speaking} onSpeak={() => speaking ? stopSpeak() : speak(m.content, session?.id, { voice, language })}><p className="chat-text">{m.content}</p></ChatMessage>)}
          {submitting && !streaming && <ChatMessage type="ai"><div className="ai-thinking"><span className="spinner" /> Analysing your answer…</div></ChatMessage>}
        </div>
        <form className="chat-controls" onSubmit={handleSend}>
          {(listening || transcribing) && <div className="transcript-preview"><span className="live-dot" /> {listening ? 'Listening — speak clearly' : 'Processing…'}<span className="transcript-echo">{answer}</span></div>}
          {error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}
          <div className="chat-input-row">
            <input ref={inputRef} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your response or speak…" disabled={submitting || !question || isDone} />
            {mode !== 'Typing only' && <button type="button" className={`live-mic${listening ? ' active' : ''}`} onClick={() => (listening ? stopRecording() : startRecording())} disabled={submitting || !question || isDone} aria-label={listening ? 'Stop listening' : 'Start microphone'}><Icon name={listening ? 'close' : 'mic'} size={22} /><i /></button>}
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