import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/Button'
import { Tag } from '../../components/UI'

const focusAreas = ['Technical', 'Behavioural', 'Managerial']
const levels = ['Junior', 'Mid-level', 'Senior / Staff']
const modes = ['Voice input', 'Typing only']
const goals = ['Prepare for a specific role', 'Improve one skill', 'Explore a new career path']

function ChoiceCard({ icon, title, options, selected, onSelect }) {
  return <article className="panel setup-choice-card"><div className="setup-choice-heading"><span><Icon name={icon} size={18}/></span><h2>{title}</h2></div><div className="choice-list">{options.map((option) => <button key={option} className={selected === option ? 'selected' : ''} onClick={() => onSelect(option)}>{option}{selected === option && <Icon name="check" size={16}/>}</button>)}</div></article>
}

function FeedbackPanel() {
  return <div className="interview-feedback"><div><span>Accuracy</span><strong>92%</strong><i><b style={{width: '92%'}} /></i></div><div><span>Communication</span><strong>85%</strong><i><b style={{width: '85%'}} /></i></div><div><span>Confidence</span><strong>78%</strong><i><b style={{width: '78%'}} /></i></div></div>
}

function ChatMessage({ type, children }) {
  return <div className={`chat-message ${type}`}><span className="chat-avatar">{type === 'ai' ? <Icon name="spark" size={17}/> : 'AM'}</span><div className="chat-bubble">{children}</div></div>
}

export function Interview() {
  const [started, setStarted] = useState(false)
  const [focus, setFocus] = useState('Technical')
  const [level, setLevel] = useState('Mid-level')
  const [mode, setMode] = useState('Voice input')
  const [goal, setGoal] = useState(goals[0])
  const [targetRole, setTargetRole] = useState('Frontend Developer')
  const [recording, setRecording] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [answer, setAnswer] = useState('')

  const submitAnswer = () => { setRecording(false); setSubmitted(true) }
  const leaveRoom = () => { setStarted(false); setSubmitted(false); setRecording(false); setAnswer('') }

  if (!started) return <div className="interview-page interview-setup-page"><div className="interview-setup-heading"><span className="eyebrow">AI MOCK INTERVIEW</span><h1>Set up your interview</h1><p>Tailor the AI coach to your specific career goals.</p></div><div className="setup-choice-grid"><ChoiceCard icon="spark" title="Focus area" options={focusAreas} selected={focus} onSelect={setFocus}/><ChoiceCard icon="chart" title="Level" options={levels} selected={level} onSelect={setLevel}/><ChoiceCard icon="mic" title="Interview mode" options={modes} selected={mode} onSelect={setMode}/></div><section className="panel setup-goal"><div className="setup-goal-copy"><span className="setup-label">What do you want to work on?</span><h2>Make this session useful for you.</h2><p>Choose a goal and target role so every question feels relevant.</p><div className="goal-options">{goals.map((item) => <button className={goal === item ? 'selected' : ''} key={item} onClick={() => setGoal(item)}>{item}{goal === item && <Icon name="check" size={15}/>}</button>)}</div></div><label className="target-role"><span>Target role</span><div><Icon name="briefcase" size={17}/><input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} /></div></label></section><div className="setup-action"><Button onClick={() => setStarted(true)} endIcon="arrow">Enter interview room</Button></div></div>

  return <div className="interview-live-page"><header className="live-session-header"><div><h1>{targetRole}</h1><div className="live-session-meta"><span className="live-dot"/> <b>Live session</b><span>·</span><span>Interview session #842</span></div></div><Button onClick={leaveRoom} endIcon="close">End session</Button></header><div className="live-session-layout"><section className="live-chat"><div className="chat-scroll"><ChatMessage type="ai"><p>Great to have you here. I’ve reviewed your experience and your focus on <b>{goal.toLowerCase()}</b>. To start, could you walk me through a specific project where you had to balance complex system requirements with a highly simplified user interface?</p></ChatMessage><ChatMessage type="user"><p><em>Transcribing:</em> “At my last role, the main challenge was integrating a data-heavy workflow while keeping the interface clean. We decided to use a progressive disclosure model...”</p></ChatMessage><ChatMessage type="ai"><p>That’s a strong example of progressive disclosure. Moving into {focus.toLowerCase()} depth: how did you ensure the system’s performance wasn’t compromised when handling these multi-step flows?</p></ChatMessage>{submitted && <><ChatMessage type="user"><p><em>Your response:</em> {answer || 'I focused on modularising the state management and measuring the impact after each change.'}</p></ChatMessage><div className="live-feedback-wrap"><span className="eyebrow">LIVE FEEDBACK</span><FeedbackPanel/></div></>}</div><div className="live-composer"><div className="transcription-preview"><span><i/> {recording ? 'Listening' : 'Ready'}</span><p>{recording ? '“I focused on modularising the state management...”' : 'Type your response or speak to continue.'}</p></div><div className="composer-row">{mode === 'Typing only' ? <><input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your response..."/><button className="send-button" onClick={submitAnswer} aria-label="Submit response"><Icon name="arrow" size={19}/></button></> : <><input value={recording ? 'Listening to your answer...' : ''} readOnly placeholder="Type your response or speak..."/><button className={`live-mic${recording ? ' active' : ''}`} onClick={() => recording ? submitAnswer() : setRecording(true)} aria-label={recording ? 'Stop and analyse' : 'Start microphone'}><Icon name={recording ? 'close' : 'mic'} size={25}/><i/></button></>}</div></div></section><aside className="live-context"><section className="context-card"><div className="context-title"><h2>Resume context</h2><Icon name="check" size={16}/></div><div className="resume-context-file"><span><Icon name="file" size={20}/></span><div><b>Alex_Mvondo_CV.pdf</b><small>Added 2h ago</small></div></div></section><section className="context-card"><h2>Current focus</h2><div className="context-tags"><Tag tone="violet">{focus}</Tag><Tag>Trade-off analysis</Tag><Tag>Scalability</Tag><Tag>{targetRole}</Tag></div></section><section className="context-card live-analysis"><h2>Live analysis</h2><div><span>Clarity <b>82%</b></span><ProgressBar value={82}/></div><div><span>Confidence <b>75%</b></span><ProgressBar value={75} cyan/></div><div className="ai-hint"><strong><Icon name="spark" size={14}/> AI hint</strong><p>Keep highlighting the “why” behind your design decisions for stronger senior-level signals.</p></div></section></aside></div></div>
}

function ProgressBar({ value, cyan = false }) {
  return <i className={`context-progress${cyan ? ' cyan' : ''}`}><b style={{width: `${value}%`}} /></i>
}
