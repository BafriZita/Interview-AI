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

  if (!started) return <div className="interview-page interview-setup-page"><div className="interview-setup-heading"><span className="eyebrow">AI MOCK INTERVIEW</span><h1>Set up your interview</h1><p>Tailor the AI coach to your specific career goals.</p></div><div className="setup-choice-grid"><ChoiceCard icon="spark" title="Focus area" options={focusAreas} selected={focus} onSelect={setFocus}/><ChoiceCard icon="chart" title="Level" options={levels} selected={level} onSelect={setLevel}/><ChoiceCard icon="mic" title="Interview mode" options={modes} selected={mode} onSelect={setMode}/></div><section className="panel setup-goal"><div className="setup-goal-copy"><span className="setup-label">What do you want to work on?</span><h2>Make this session useful for you.</h2><p>Choose a goal and target role so every question feels relevant.</p><div className="goal-options">{goals.map((item) => <button className={goal === item ? 'selected' : ''} key={item} onClick={() => setGoal(item)}>{item}{goal === item && <Icon name="check" size={15}/>}</button>)}</div></div><label className="target-role"><span>Target role</span><div><Icon name="briefcase" size={17}/><input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} /></div></label></section><div className="setup-action"><Button onClick={() => setStarted(true)} endIcon="arrow">Enter interview room</Button></div></div>

  return <div className="interview-page interview-room-page"><div className="room-header"><div><button className="back-link" onClick={() => { setStarted(false); setSubmitted(false); setRecording(false) }}><Icon name="arrow" size={15}/> Change setup</button><span className="eyebrow">{focus} · {level} · {targetRole}</span><h1>Your AI interview room</h1></div><div className="room-tags"><Tag tone="violet">{mode}</Tag><Tag tone="green">Session active</Tag></div></div><div className="room-content"><section className="question-card ai-gradient-border"><span className="question-label">Question 1 of 5 · {focus}</span><h2>Can you walk me through a time you had to optimise a complex system under tight deadline constraints?</h2><p><Icon name="spark" size={16}/> Keep your answer focused on the situation, your action, and the result.</p></section>{!submitted && mode === 'Voice input' && <section className="response-interface voice-interface"><div className="voice-wave">{[20,50,80,40,90,30,60,20,70,40,63,31,76,43,57].map((height, index) => <i key={index} style={{height: `${recording ? ((height + index * 11) % 75) + 20 : height}%`}} />)}</div><p>{recording ? 'Listening... speak naturally. Your answer is being transcribed.' : 'Click the microphone to start recording your answer.'}</p><button className={`record-button${recording ? ' recording' : ''}`} onClick={() => recording ? submitAnswer() : setRecording(true)}><Icon name={recording ? 'close' : 'mic'} size={27}/></button><strong>{recording ? 'Stop & analyse' : 'Start voice answer'}</strong></section>}{!submitted && mode === 'Typing only' && <section className="response-interface typing-interface"><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer here..."/><div><span>{answer.length} characters</span><Button onClick={submitAnswer} endIcon="arrow">Submit answer</Button></div></section>}{submitted && <section className="submitted-state"><div className="submitted-badge"><Icon name="check" size={20}/></div><h2>Answer analysed</h2><p>Here is a quick read on how your answer came across.</p><FeedbackPanel/><Button onClick={() => setSubmitted(false)} variant="outline">Try this answer again</Button></section>}<div className="room-footer"><span>Goal: <b>{goal}</b></span><span>Question 1 of 5</span></div></div></div>
}
