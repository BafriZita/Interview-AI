import OpenAI from 'openai'
import fs from 'node:fs/promises'
import { env } from '../config/env.js'
import { buildQuestionSet } from './question-bank.service.js'

const client = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey, maxRetries: 0, timeout: 8000 }) : null
export const aiConfigured = Boolean(client)

// Once OpenAI reports the account has no credits, every AI call falls back to
// the instant heuristic path instead of waiting on the API each time. The flag
// is cleared periodically so a newly-funded account recovers without a restart.
let aiUnavailable = false
setInterval(() => { aiUnavailable = false }, 30 * 60 * 1000).unref()

function markUnavailable(error) {
  if (error) aiUnavailable = true
}

async function chatJson(messages, { jsonSchema, fallbackResult, maxTokens = 1200 }) {
  if (!client || aiUnavailable) return fallbackResult
  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices?.[0]?.message?.content || ''
    try {
      return JSON.parse(raw)
    } catch {
      return fallbackResult
    }
  } catch (error) {
    markUnavailable(error)
    return fallbackResult
  }
}

const systemFor = (targetRole, candidateName) => `You are InterviewAI, a warm, friendly and deeply human interview coach. You are coaching ${candidateName || 'your candidate'} for a ${targetRole || 'software'} role. You are kind, encouraging and conversational — you talk the way a great mentor talks: upbeat, personal, a little playful, but always honest. You never sound like a robot. You remember the candidate's name, their resume, what they said earlier in this session, and you build on it. You analyse answers with genuine care: praise what was strong, be gently honest about what was weak, and always give one concrete way to improve. Keep replies lively and natural, never a list of bullet points.`

function analysisOf(answerText) {
  const text = (answerText || '').trim()
  const words = text.split(/\s+/).filter(Boolean).length
  const hasSTAR = /situation|task|action|result|context|challenge|outcome|impact|\bstar\b/i.test(text)
  const hasMetrics = /\d+(\.\d+)?\s*(%|percent|people|users|clients|requests|revenue|cost|downtime|latency|ms|s|minutes|hours|days|weeks|sprints|features|projects|teams|requests|tickets)/i.test(text)
  const hasTech = /\b(built|designed|scaled|implemented|architect|led|launched|migrated|optimised|optimized|automated|refactored|integrated|developed|api|database|sql|cloud|aws|azure|docker|kubernetes|react|node|python|javascript|typescript|java|performance|cache|testing|ci|cd|git)\b/i.test(text)
  const hasRole = /\bI (was|am|have|worked|led|owned|managed|built|designed|delivered|responsible|helped|drove)\b/i.test(text)
  const short = words < 15
  const concise = words >= 15 && words <= 70
  const long = words > 70
  return { text, words, hasSTAR, hasMetrics, hasTech, hasRole, short, concise, long }
}

function pick(list, seed) {
  const s = String(seed || '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return list[Math.abs(h) % list.length]
}

function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || 'friend'
}

function heuristicEvaluation(context) {
  const a = analysisOf(context.answerText)
  const name = firstName(context.candidateName)
  const feedbackParts = []
  if (a.short) feedbackParts.push(`You kept it brief — that is okay, but I want the full story. Interviewers reward specifics: the situation, your exact role, and the outcome.`)
  else if (a.hasSTAR && a.hasMetrics) feedbackParts.push(`This is the shape of a top answer — structure and a measurable result. Honestly impressive, ${name}.`)
  else if (a.words <= 30) feedbackParts.push(`Solid and readable. It is a touch high-level though — zoom in on one concrete example and what you personally did.`)
  else if (a.long) feedbackParts.push(`You covered a lot of ground — good stamina. Watch for rambling; tighten it around one clear example and a punchy result.`)
  else feedbackParts.push(`Nice and well-paced. You are giving real substance here, and it shows.`)
  if (!a.hasRole && !a.hasSTAR) feedbackParts.push(`Frame it around your actions — "I led…", "I built…", "I drove…" — so the interviewer sees your fingerprints on the work.`)
  if (!a.hasMetrics) feedbackParts.push(`Easy upgrade: add a number. A metric or a scale ("team of 6", "40% faster") turns a good answer into a memorable one.`)
  if (a.short && a.hasMetrics) feedbackParts.push(`You even included a number — now wrap it in the story that leads to it.`)

  const feedback = feedbackParts.join(' ')
  const hint = a.short
    ? 'Expand to 60–90 seconds: Situation, Task, Action, Result.'
    : !a.hasSTAR
      ? 'Structure it with the STAR method and end with the measurable result.'
      : !a.hasMetrics
        ? 'Quantify the outcome — percentages, headcount, time saved, or scale.'
        : 'Lead with the result, then give one concrete example of how you got there.'

  // Wide, content-derived bands so honest differences between answers show up
  // clearly in the numbers instead of every answer landing around 70.
  const wordBonus = Math.min(a.words, 120) * 0.45
  const clarity = clamp(35 + wordBonus + (a.hasSTAR ? 12 : 0) - (a.long ? 8 : 0))
  const communication = clamp(30 + (a.hasSTAR ? 18 : 0) + (a.hasRole ? 10 : 0) + (a.concise ? 12 : 0) + (a.short ? -8 : 0))
  const confidence = clamp(32 + (a.hasRole ? 16 : 0) + (a.hasMetrics ? 10 : 0) + (a.long ? 12 : 0) + (a.short ? -10 : 0))
  const technical = clamp(30 + (a.hasTech ? 26 : 0) + (a.hasMetrics ? 14 : 0) + (a.hasSTAR ? 8 : 0))
  const overall = Math.round((clarity + communication + confidence + technical) / 4)
  return {
    scores: { clarity, communication, confidence, technical_depth: technical },
    overallScore: overall,
    feedback,
    coachHint: hint,
  }
}

function buildReportFallback(context) {
  const qa = (context.questions || []).map((q, i) => ({
    question: q.question_text,
    answer: context.answers?.[i]?.answer_text || null,
    score: context.answers?.[i]?.overall_score ?? null,
    hint: context.answers?.[i]?.coach_hint || null,
  })).filter((x) => x.answer)
  if (!qa.length) {
    return {
      summary: 'This interview has no recorded answers yet, so there is nothing to score. Answer each question (out loud or in writing) and an honest report with a real score and feedback will appear here.',
      overallScore: null,
      strengths: [],
      improvements: [],
      solutions: [],
      skillScores: { clarity: null, communication: null, confidence: null, technical_depth: null },
    }
  }
  const scores = qa.map((x) => x.score).filter((v) => v != null)
  const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const highs = scores.filter((s) => s >= 75).length
  const mids = scores.filter((s) => s >= 55 && s < 75).length
  const lows = scores.filter((s) => s < 55).length
  const analyses = qa.map((x) => ({ ...x, a: analysisOf(x.answer || '') }))
  const structured = analyses.filter((x) => x.a.hasSTAR || x.a.hasRole).length
  const quantified = analyses.filter((x) => x.a.hasMetrics).length
  const technical = analyses.filter((x) => x.a.hasTech).length
  const brief = analyses.filter((x) => x.a.short).length

  const summaryParts = [
    `You answered ${qa.length} question${qa.length === 1 ? '' : 's'} for the ${context.targetRole || 'role'} you are targeting.`,
  ]
  if (scores.length) {
    summaryParts.push(`Your average score was ${overall}/100, with ${highs} strong answer${highs === 1 ? '' : 's'}, ${mids} solid one${mids === 1 ? '' : 's'} and ${lows} that need work.`)
  }
  if (structured && quantified) summaryParts.push('You combined structure with measurable results — the strongest mix an interviewer looks for.')
  else if (quantified) summaryParts.push('You used numbers well; framing them inside a clear structure will make them land harder.')
  else if (structured) summaryParts.push('Your answers were structured; adding concrete numbers would make them more memorable.')
  else summaryParts.push('Most answers stayed high-level — grounding them in specific examples and metrics is your biggest lever.')

  const strengths = []
  if (structured >= Math.max(1, Math.ceil(qa.length / 2))) strengths.push(`You gave structured, action-led answers in ${structured} of ${qa.length} question${qa.length === 1 ? '' : 's'}.`)
  if (quantified >= Math.max(1, Math.ceil(qa.length / 2))) strengths.push(`You backed ${quantified} answer${quantified === 1 ? '' : 's'} with numbers and measurable outcomes.`)
  if (technical >= Math.max(1, Math.ceil(qa.length / 2))) strengths.push(`You used concrete technical detail in ${technical} answer${technical === 1 ? '' : 's'}.`)
  if (overall != null && overall >= 75) strengths.push('Overall you performed at a high level this session.')
  if (!strengths.length) strengths.push('You completed the full session without giving up — consistency is the foundation of progress.')

  const improvements = []
  const seen = new Set()
  for (const x of analyses) {
    if (x.hint && !seen.has(x.hint)) {
      seen.add(x.hint)
      improvements.push(x.hint)
      if (improvements.length >= 3) break
    }
  }
  if (brief > 0 && !improvements.some((i) => /expand|60/i.test(i))) improvements.push(`You kept ${brief} answer${brief === 1 ? 's' : ''} very brief — expand them into full STAR stories.`)
  if (overall != null && overall < 55) improvements.push('Several answers scored below target — the gaps above are your priority before the next session.')
  if (!improvements.length) improvements.push('Weave a specific example and a measurable result into every answer.')

  const solutions = []
  for (const item of improvements.slice(0, 3)) {
    if (/structure|star|situation/i.test(item)) solutions.push('Draft one STAR story per common interview question and rehearse it aloud twice.')
    else if (/metric|number|quantif|scale/i.test(item)) solutions.push('Rewrite your top 3 answers adding one hard number each (time saved, scale, revenue, team size).')
    else if (/expand|brief|60|90/i.test(item)) solutions.push('Time yourself: aim for 60–90 seconds per answer with a clear beginning, middle and end.')
    else solutions.push('Practise your weakest questions again — record the audio and listen for filler words.')
  }
  while (solutions.length < 3) solutions.push('Do one more mock session this week to convert this feedback into muscle memory.')

  const avg = (fn) => {
    if (!analyses.length) return 60
    return Math.round(analyses.reduce((a, x) => a + fn(x.a), 0) / analyses.length)
  }
  return {
    summary: summaryParts.join(' '),
    overallScore: overall,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    solutions: solutions.slice(0, 4),
    skillScores: {
      clarity: avg((a) => clamp(35 + Math.min(a.words, 120) * 0.45 + (a.hasSTAR ? 12 : 0) - (a.long ? 8 : 0))),
      communication: avg((a) => clamp(30 + (a.hasSTAR ? 18 : 0) + (a.hasRole ? 10 : 0) + (a.concise ? 12 : 0) + (a.short ? -8 : 0))),
      confidence: avg((a) => clamp(32 + (a.hasRole ? 16 : 0) + (a.hasMetrics ? 10 : 0) + (a.long ? 12 : 0) + (a.short ? -10 : 0))),
      technical_depth: avg((a) => clamp(30 + (a.hasTech ? 26 : 0) + (a.hasMetrics ? 14 : 0) + (a.hasSTAR ? 8 : 0))),
    },
  }
}

function friendlyCoachReply(userMessage, candidateName, extra = {}) {
  const name = firstName(candidateName)
  const message = String(userMessage || '')
  const text = message.toLowerCase()
  const score = extra.overallScore != null ? Number(extra.overallScore) : null
  const nextQ = String(extra.nextQuestion || '').trim()
  const evaluationFeedback = extra.evaluationFeedback || ''
  const conversationHistory = extra.conversationHistory || []

  // Analyze the user's message to understand intent
  const isQuestion = /\?\s*$/.test(message.trim())
  const isClarificationRequest = /(what (do you mean|kind of example)|i don't understand|can you explain|clarify|rephrase)/i.test(text)
  const isSkipRequest = /(skip|next question|move on|pass)/i.test(text)
  const isFeedbackResponse = evaluationFeedback && (/(yes|yeah|yep|sure|ok|okay|ready|next|nope|no|nah)/i.test(text) || isQuestion || isClarificationRequest)
  const isGreeting = /^(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(text)
  const isThanks = /^(thank|thanks)\b/i.test(text)
  const isNervous = /(nervous|anxious|scared|afraid|worry|stress)/i.test(text)
  const isShort = message.trim().split(/\s+/).length < 15

  // Get the last AI question from history for context
  let lastAIQuestion = ''
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    if (conversationHistory[i].role === 'assistant' && conversationHistory[i].content.startsWith('Question:')) {
      lastAIQuestion = conversationHistory[i].content.replace('Question: ', '')
      break
    }
  }

  // Get the last AI feedback from history
  let lastAIFeedback = ''
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    if (conversationHistory[i].role === 'assistant' && !conversationHistory[i].content.startsWith('Question:')) {
      lastAIFeedback = conversationHistory[i].content
      break
    }
  }

  const hasSpecifics = /\d+(\.\d+)?\s*(%|percent|users|clients|revenue|cost|people|team|months|years|weeks|days|hours|ms|seconds|requests|transactions|api|database|server|latency|throughput|scale|reduced|increased|improved|cut|saved|delivered|launched|built|designed|implemented|architected|led|managed|owned|drove)\b/i.test(message)
  const hasSTAR = /situation|task|action|result|context|challenge|outcome|impact|example|instance|specific|concrete|real|actual/i.test(message)
  const hasOwnership = /\bi (led|built|designed|created|developed|implemented|launched|drove|managed|owned|delivered|improved|reduced|increased|solved|fixed|architected|decided|chose|prioritized)\b/i.test(message)
  const wordCount = message.trim().split(/\s+/).length

  let response = ''

  // 1. Handle clarification requests about the question itself
  if (isClarificationRequest && lastAIQuestion) {
    const opener = pick([
      `Good question, ${name}. Let me rephrase. `,
      `Sure thing, ${name}. Here's what I'm asking: `,
      `Happy to clarify, ${name}. `,
    ], message)
    response = `${opener}When I ask "${lastAIQuestion}", I'm looking for a specific example from your experience. Think of a real situation you faced, what you did, and what happened. It doesn't need to be perfect — just honest. Want to give it a try?`
    return response
  }

  // 2. Handle skip requests
  if (isSkipRequest) {
    const opener = pick([
      `Absolutely, ${name}. Let's move on. `,
      `No problem, ${name}. On to the next one. `,
      `Sure, ${name}. Here's another: `,
    ], message)
    const next = nextQ ? `Next question: ${nextQ}` : 'That was the last question — tap "End session" for your report.'
    return `${opener}${next}`
  }

  // 3. Handle user responding to feedback (not answering a new question)
  if (isFeedbackResponse && lastAIFeedback && !isQuestion) {
    const affirmative = /^(yes|yeah|yep|sure|ok|okay|ready|next)$/i.test(text)
    if (affirmative) {
      const next = nextQ ? `Great, let's keep going. ${nextQ}` : 'That was the last question — tap "End session" for your report.'
      return `${pick([`Good, ${name}. `, `Sounds good, ${name}. `, `Alright, ${name}. `], message)}${next}`
    }
    // User asked a follow-up about the feedback
    const opener = pick([
      `Great follow-up, ${name}. `,
      `Good question, ${name}. `,
      `I'm glad you asked, ${name}. `,
    ], message)
    if (/what kind of example|what example|give me an example/i.test(text)) {
      response = `${opener}For your answer about ${lastAIQuestion?.slice(0, 60)}..., a strong example would be: a specific situation, what YOU did (not "we"), and a measurable result — like "I reduced deployment time by 40% by introducing automated testing." Does that help clarify?`
    } else if (/how|what should i|what do you mean/i.test(text)) {
      response = `${opener}Here's what would make it stronger: be specific about the situation, own your actions with "I", and include a concrete result (numbers help). Try retelling it with those pieces.`
    } else {
      response = `${opener}When I gave that feedback, I meant: your answer had good intent but would land better with a real story and a measurable outcome. What part would you like to dig into?`
    }
    return response
  }

  // 4. Handle greetings/thanks/nerves (not an interview answer)
  if (isGreeting || isThanks || isNervous) {
    const opener = pick([
      `Hey ${name}! `,
      `Hi ${name}. `,
      `${name}, `,
    ], message)
    if (isGreeting) {
      response = `${opener}Nice to see you. Ready when you are — just answer naturally and we'll work through it together.`
    } else if (isThanks) {
      response = `${opener}You're doing the work — that's what matters. Keep going.`
    } else {
      response = `${opener}Nerves are normal — even great candidates get them. Slow down, breathe, and answer one idea at a time. You've got this.`
    }
    return response
  }

  // 5. Handle actual interview answers (with score context if available)
  if (score != null) {
    const opener = pick([
      `Okay ${name}, honest coach check. `,
      `Right, ${name} — real talk. `,
      `Good effort, ${name}. Now the honest bit. `,
      `I'm going to be straight with you, ${name}. `,
    ], message)

    const specifics = []
    if (hasSpecifics) specifics.push("you included numbers — that's strong")
    if (hasSTAR) specifics.push("you gave a concrete example")
    if (hasOwnership) specifics.push("you owned it with 'I' statements")
    if (!hasSpecifics && !hasSTAR && !hasOwnership) specifics.push("it stayed high-level without a concrete story or numbers")

    const whatWorked = specifics.filter(s => s.startsWith('you')).join(', ') || 'you answered'
    const whatMissed = specifics.filter(s => !s.startsWith('you')).join(', ') || 'a concrete example with measurable results'

    let feedback = ''
    if (score >= 75) {
      feedback = pick([
        `that landed well — ${whatWorked}. To level up, go one layer deeper on the "how" and name the exact scale of impact. `,
        `nice work — ${whatWorked}. Push further by adding the specific metric (users, %, seconds saved) and the lesson you took away. `,
      ], `${score}`)
    } else if (score >= 50) {
      feedback = pick([
        `solid start — ${whatWorked}, but ${whatMissed}. Interviewers need one real situation, what YOU specifically did, and a measured outcome. `,
        `decent — ${whatWorked}, though it read a bit generic. Anchor it with one concrete story and one hard number — that's what makes it memorable. `,
      ], `${message.length}`)
    } else {
      feedback = pick([
        `honestly, this one missed the mark — ${whatMissed}. Rebuild it with STAR: Situation, your Task, the Action YOU took, the Result you measured. `,
        `I have to be honest — that answer didn't land. It lacked a real example and a measurable result. Rebuild it around one specific story with a clear before and after. `,
      ], `${name.length}`)
    }

    // Add a natural follow-up question based on their answer
    let followUp = ''
    if (score < 75) {
      if (!hasSTAR) followUp = ` Want to try retelling it with a specific example?`
      else if (!hasSpecifics) followUp = ` What was the measurable result?`
      else if (!hasOwnership) followUp = ` What was YOUR specific role in that?`
    } else {
      followUp = ` What did you learn from that experience?`
    }

    const next = nextQ ? ` When you're ready: ${nextQ}` : ` That was the last question — tap "End session" for your report.`
    return `${opener}${feedback}${followUp}${next}`
  }

  // 6. User asking a question (not an answer)
  if (isQuestion) {
    const opener = pick([
      `Great question, ${name}. `,
      `I love that you asked, ${name}. `,
      `That's a good one, ${name}. `,
      `Happy to help, ${name}. `,
    ], message)
    let topic = pick([
      'structure every answer around a concrete result you delivered',
      'add one hard number to your next answer — even an estimate counts',
      'name the situation briefly, then spend most of your time on YOUR actions',
      'finish answers with what you learned, so you sound senior and reflective',
    ], message)
    if (/how do i|what should i/i.test(text)) topic = 'the strongest answers follow one shape: Situation, your Task, the Action you took, and the Result you measured'
    else if (/example/i.test(text)) topic = 'a strong example is specific: situation, your action, measurable result'
    response = `${opener}${topic}. Want to try it on the current question?`
    return response
  }

  // 7. Default: treat as interview answer without score (shouldn't happen often)
  const opener = pick([
    `Thanks for sharing that, ${name}. `,
    `Got it, ${name}. `,
    `That's a start, ${name}. `,
  ], message)
  const next = nextQ ? `Next up: ${nextQ}` : 'That was the last question — tap "End session" for your report.'
  return `${opener}Could you give me a bit more detail — a specific situation, what you did, and the result?${next}`
}

function coachPersona(targetRole, candidateName, extra = {}) {
  const evaluationNote = extra.evaluationFeedback
    ? `\n\nThe candidate's LATEST answer was just evaluated. The evaluation summary: "${extra.evaluationFeedback}" (Score: ${extra.overallScore ?? 'N/A'}/100). Use this as context but respond naturally to what they say next.`
    : ''
  const nextNote = extra.nextQuestion
    ? `\n\nThere is a next question available: "${extra.nextQuestion}". Don't present it immediately — wait for the right moment in conversation.`
    : `\n\nThis was the last question. After wrapping up, remind them to tap "End session" for their report.`
  return `You are InterviewAI, a warm, deeply human interview coach chatting LIVE with ${candidateName || 'the candidate'} inside a mock interview for the ${targetRole || 'target'} role. You talk like a favourite mentor: upbeat, personal, a little playful, but always honest — never robotic, never a list of bullets.

CONVERSATION CONTEXT:
You have access to the FULL conversation history including:
- Your previous questions (prefixed with "Question:")
- The candidate's answers
- Your previous feedback/responses
- The candidate's follow-up questions and your replies

RULES FOR EVERY REPLY:
1. READ the full history first. Understand what's being discussed right now.
2. Determine the user's intent:
   - Are they ANSWERING the current interview question?
   - Are they ASKING a clarifying question about the question?
   - Are they RESPONDING to your previous feedback?
   - Are they ASKING for an example/explanation?
   - Are they asking to SKIP the question?
   - Are they expressing NERVES/THANKS/GREETING?
   - Are they going OFF-TOPIC?
3. RESPOND appropriately:
   - If ANSWERING: Acknowledge their specific answer, give honest feedback referencing THEIR words, ask ONE relevant follow-up or present next question naturally.
   - If ASKING FOR CLARIFICATION: Rephrase the question simply, encourage them to try.
   - If RESPONDING TO FEEDBACK: Answer their follow-up, then guide back.
   - If ASKING TO SKIP: Acknowledge, present next question.
   - If NERVES/THANKS/GREETING: Warm response, keep interview on track.
   - If OFF-TOPIC: Gently redirect back to interview.
4. Be conversational: short sentences, natural flow, reference their actual words.
5. NEVER give generic advice disconnected from their answer.
6. NEVER force STAR method unless their answer genuinely needs structure.
7. Keep interview moving but at a natural pace.${evaluationNote}${nextNote}

Remember their name, resume, and everything said this session. Build on it naturally.`
}

/**
 * AI-generated interview questions, personalised to the candidate's resume and target role.
 * @param {{ targetRole:string, resumeText?:string, candidateName?:string, type:string, count:number, level?:string }} context
 */
export async function generateQuestions(context) {
  if (!client) return buildQuestionSet(context.type, context.count, context.level)
  const resume = (context.resumeText || '').trim().slice(0, 4000)
  const name = firstName(context.candidateName)
  const levelGuide = context.level === 'Junior'
    ? 'Focus on foundational concepts, learning ability, and potential. Questions should be approachable but reveal depth of understanding.'
    : context.level === 'Senior / Staff'
    ? 'Focus on architectural decisions, trade-offs, mentoring, and strategic thinking. Questions should probe for systems-level thinking and leadership.'
    : 'Focus on practical experience, problem-solving, and delivery. Questions should balance depth with real-world pragmatism.'
  try {
    const data = await chatJson([
      { role: 'system', content: `You are a senior interview coach. Generate realistic, challenging interview questions for a ${context.targetRole || 'software'} interview based on the candidate's resume and background. Personalise them — every question should feel like it was written for this specific person, ${name || 'the candidate'}. Avoid repeating questions from the candidate's previous sessions. Return ONLY JSON.

Difficulty level: ${context.level || 'Mid-level'}
${levelGuide}` },
      { role: 'user', content: JSON.stringify({ interviewType: context.type, questionCount: context.count, resume, candidateName: name, level: context.level }) },
    ], {
      fallbackResult: { questions: buildQuestionSet(context.type, context.count, context.level) },
      maxTokens: 2000,
    })
    const list = Array.isArray(data?.questions) ? data.questions : []
    if (!list.length) return buildQuestionSet(context.type, context.count, context.level)
    return list.slice(0, context.count).map((q, i) => ({
      questionType: typeof q.question_type === 'string' ? q.question_type : typeof q.questionType === 'string' ? q.questionType : context.type === 'mixed' ? (i % 2 ? 'behavioral' : 'technical') : context.type,
      questionText: String(q.question_text || q.question || q.questionText || '').trim(),
    })).filter((q) => q.questionText)
  } catch {
    return buildQuestionSet(context.type, context.count, context.level)
  }
}

/**
 * Transcribe recorded speech with Whisper.
 * @param {{ buffer:Buffer, mimeType:string, originalName?:string }} file
 */
export async function transcribeAudio(file) {
  if (!client || aiUnavailable) return null
  try {
    const name = file.originalName || `audio.${(file.mimeType || 'audio/webm').includes('mpeg') ? 'mp3' : 'webm'}`
    const blob = new Blob([file.buffer], { type: file.mimeType || 'audio/webm' })
    const transcript = await client.audio.transcriptions.create({
      file: new File([blob], name, { type: blob.type }),
      model: env.openaiWhisperModel,
    })
    return transcript.text || ''
  } catch (error) {
    markUnavailable(error)
    return null
  }
}

/**
 * Evaluate one interview answer. Returns score components, honest feedback and a coach hint.
 * @param {{ targetRole:string, resumeText?:string, candidateName?:string, question:{question_type:string, question_text:string}, answerText:string }} context
 */
export async function evaluateAnswer(context) {
  if (!client) return heuristicEvaluation(context)
  const resume = (context.resumeText || '').trim().slice(0, 3000)
  const name = firstName(context.candidateName)
  try {
    const data = await chatJson([
      { role: 'system', content: `${systemFor(context.targetRole, name)} Evaluate the candidate's answer to this interview question. Be warm but honest. Return ONLY JSON with: scores {clarity 0-100, communication 0-100, confidence 0-100, technical_depth 0-100}, overall_score 0-100, feedback (2-3 friendly but candid sentences: what was strong, what was weak, what was missed), coach_hint (one actionable hint).` },
      { role: 'user', content: JSON.stringify({ question: context.question, answer: context.answerText, resume, targetRole: context.targetRole, candidateName: name }) },
    ], {
      fallbackResult: null,
    })
    if (!data) return heuristicEvaluation(context)
    const scores = data.scores || {}
    return {
      scores: {
        clarity: clamp(scores.clarity),
        communication: clamp(scores.communication),
        confidence: clamp(scores.confidence),
        technical_depth: clamp(scores.technical_depth),
      },
      overallScore: clamp(data.overall_score),
      feedback: String(data.feedback || '').trim() || heuristicEvaluation(context).feedback,
      coachHint: String(data.coach_hint || '').trim() || heuristicEvaluation(context).coachHint,
    }
  } catch {
    return heuristicEvaluation(context)
  }
}

/**
 * Generate the honest end-of-session report: summary, strengths, improvements and concrete solutions.
 * @param {{ targetRole:string, interviewType:string, candidateName?:string, questions:Array, answers:Array }} context
 */
export async function generateReport(context) {
  if (!client) return buildReportFallback(context)
  const qa = context.questions.map((q, i) => ({ question: q.question_text, type: q.question_type, answer: context.answers[i]?.answer_text || null, score: context.answers[i]?.overall_score ?? null })).filter((x) => x.answer)
  if (!qa.length) return buildReportFallback(context)
  const name = firstName(context.candidateName)
  const report = await chatJson([
    { role: 'system', content: `${systemFor(context.targetRole, name)} Produce an honest post-interview report for ${name || 'the candidate'} after a ${context.targetRole} interview. Be specific to the answers provided, warm but truthful. Return ONLY JSON with: summary (2-3 sentences on how the whole interview went), strengths (array of 3-5 specific true strengths), improvements (array of 3-5 specific weaknesses to fix, ranked by impact), solutions (array of 3-5 concrete exercises/actions addressing each improvement), skill_scores {clarity, communication, confidence, technical_depth} each 0-100, overall_score 0-100.` },
    { role: 'user', content: JSON.stringify({ qa, candidateName: name }) },
  ], {
    fallbackResult: null,
    maxTokens: 2000,
  })
  if (!report) return buildReportFallback(context)
  const skillScores = report.skill_scores || {}
  return {
    summary: String(report.summary || '').trim() || buildReportFallback(context).summary,
    overallScore: clamp(report.overall_score ?? 70),
    strengths: Array.isArray(report.strengths) ? report.strengths.map(String) : [],
    improvements: Array.isArray(report.improvements) ? report.improvements.map(String) : [],
    solutions: Array.isArray(report.solutions) ? report.solutions.map(String) : [],
    skillScores: {
      clarity: clamp(skillScores.clarity),
      communication: clamp(skillScores.communication),
      confidence: clamp(skillScores.confidence),
      technical_depth: clamp(skillScores.technical_depth),
    },
  }
}

const RESUME_SKILL_PATTERN = /\b(react|react\.js|next\.js|vue|angular|typescript|javascript|node|node\.js|express|python|java|go|rust|php|c\+\+|c#|ruby|sql|postgres|postgresql|mysql|mongodb|redis|graphql|rest api|docker|kubernetes|k8s|aws|azure|gcp|terraform|jenkins|github actions|ci\/cd|html|css|tailwind|sass|figma|git|agile|scrum|jira|testing|jest|playwright|cypress|selenium|unit test|accessibility|system design|microservices|machine learning|ai|data analysis|power bi|excel|leadership|teamwork|communication|product management|project management|sales|marketing)\b/gi

function detectSkillsFromResume(resumeText) {
  const matches = String(resumeText || '').match(RESUME_SKILL_PATTERN) || []
  const seen = new Set()
  const skills = []
  for (const m of matches) {
    const clean = m.toLowerCase()
    if (seen.has(clean)) continue
    seen.add(clean)
    skills.push(m)
  }
  return skills.slice(0, 12)
}

function heuristicResumeAnalysis(resumeText, originalName) {
  const text = String(resumeText || '')
  const lower = text.toLowerCase()
  const skills = detectSkillsFromResume(text)
  const hasLength = text.length > 300
  const hasMetrics = /\d+(\s?%|percent|\$\s?\d|k\b|years|users|revenue|cost|downtime)/i.test(text)
  const hasRoles = /\b(led|built|designed|developed|managed|improved|reduced|increased|delivered|launched|responsible for)\b/i.test(text)
  let score = 62
  if (hasLength) score += 10
  if (hasMetrics) score += 10
  if (hasRoles) score += 8
  if (skills.length >= 4) score += 6
  const suggestions = []
  if (!hasMetrics) suggestions.push({ title: 'Add measurable impact', description: 'Replace general duties with outcomes, percentages, or project results.', priority: 'High' })
  if (!hasRoles) suggestions.push({ title: 'Show ownership', description: 'Start bullets with action verbs like "Led", "Built" and "Improved".', priority: 'High' })
  suggestions.push({ title: 'Strengthen your summary', description: 'Mention your target role and the technologies you use most confidently.', priority: 'Medium' })
  return { strengthScore: clamp(score), skills, suggestions }
}

/**
 * Analyse a resume: strength score, detected skills and improvement suggestions.
 * @param {{ resumeText:string, originalName:string }} context
 */
export async function analyseResume(context) {
  const text = (context.resumeText || '').trim()
  if (!client || !text) return heuristicResumeAnalysis(text, context.originalName)
  try {
    const data = await chatJson([
      { role: 'system', content: 'You are a senior technical recruiter. Analyse this resume. Return ONLY JSON with: strength_score (0-100), skills (array of skill names), suggestions (array of {title, description, priority High/Medium/Low}).' },
      { role: 'user', content: text.slice(0, 5000) },
    ], {
      fallbackResult: heuristicResumeAnalysis(text, context.originalName),
      maxTokens: 1200,
    })
    return {
      strengthScore: clamp(data.strength_score),
      skills: Array.isArray(data.skills) ? data.skills.map(String).slice(0, 24) : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions.map((s) => ({ title: String(s.title || ''), description: String(s.description || ''), priority: String(s.priority || 'Medium') })).filter((s) => s.title) : [],
    }
  } catch {
    return heuristicResumeAnalysis(text, context.originalName)
  }
}

function heuristicRecommendations(resumeText, targetRole) {
  const text = String(resumeText || '').toLowerCase()
  const skills = detectSkillsFromResume(text)
  const frontend = /react|javascript|typescript|next|vue|angular|css|html|tailwind|figma/.test(text)
  const backend = /node|express|python|java|go|sql|postgres|postgresql|mysql|mongodb|api|microservices|docker/.test(text)
  const data = /sql|python|power bi|excel|data|analytics|machine learning|ai/.test(text)
  const design = /figma|design|ui|ux|prototype/.test(text)
  const leadership = /leadership|managed|team lead|mentor|lead|management/.test(text)
  const root = targetRole || (frontend ? 'Frontend Engineer' : backend ? 'Backend Engineer' : 'Software Engineer')

  const recs = []
  const add = (jobTitle, baseScore, rationale, recommendedSkills, summary, roadmap, icon) => {
    let boost = 0
    if (frontend && /frontend|ui|web/i.test(jobTitle)) boost += 8
    if (backend && /backend|full-stack|api|engineer/i.test(jobTitle)) boost += 8
    if (data && /data|analytics|scientist/i.test(jobTitle)) boost += 8
    if (design && /ui|design/i.test(jobTitle)) boost += 8
    if (leadership && /lead|manager|architect/i.test(jobTitle)) boost += 8
    const skillsNeed = recommendedSkills.slice(0, 4)
    recs.push({
      jobTitle,
      matchScore: clamp(baseScore + boost),
      rationale,
      recommendedSkills: skillsNeed,
      summary,
      roadmap,
      icon,
    })
  }

  if (frontend) {
    add('Frontend Engineer', 82, 'Your resume shows real front-end experience — this path builds on your strongest skills.', ['TypeScript', 'Testing with Jest', 'Next.js', 'Performance'], 'Leverage your front-end foundation into a senior front-end role.', ['Master TypeScript', 'Build 2 production-grade projects', 'Learn system design basics', 'Practise technical interviews'], 'briefcase')
    add('Full-stack Developer', 74, 'Extend your front-end experience towards the backend to become a complete builder.', ['Node.js', 'PostgreSQL', 'REST API design', 'System design'], 'Round out your stack to ship entire features end to end.', ['Learn a backend framework', 'Build a full-stack project', 'Learn database design', 'Practise coding interviews'], 'chart')
    add('UI Engineer', 70, 'Your design sensibility pairs well with engineering.', ['Design systems', 'Accessibility', 'Figma'], 'Bridge design and engineering for pixel-perfect products.', ['Study design systems', 'Contribute to an open-source design system', 'Build accessible components'], 'spark')
  } else if (backend) {
    add('Backend Engineer', 82, 'Your resume shows strong backend experience — this path deepens it.', ['System design', 'Docker & Kubernetes', 'SQL tuning', 'Message queues'], 'Become the engineer teams trust with core systems.', ['Master system design', 'Build a high-traffic service', 'Learn distributed systems basics', 'Practise architecture interviews'], 'briefcase')
    add('Full-stack Developer', 76, 'Add a front-end layer to your backend skills and own whole features.', ['React', 'TypeScript', 'REST API design'], 'Round out your stack to ship features end to end.', ['Learn a front-end framework', 'Build a full-stack project', 'Learn deployment', 'Practise coding interviews'], 'chart')
    add('DevOps / Platform Engineer', 72, 'Your infrastructure and scripting experience maps cleanly to platform work.', ['Terraform', 'CI/CD', 'Monitoring', 'Kubernetes'], 'Automate and scale the systems behind the product.', ['Learn infrastructure as code', 'Automate a deployment pipeline', 'Practise incident response'], 'spark')
  } else if (data) {
    add('Data Analyst', 82, 'Your analytical experience is a strong foundation for a data career.', ['SQL', 'Power BI', 'Statistical methods', 'Storytelling with data'], 'Turn raw data into decisions people act on.', ['Master SQL', 'Build 3 analysis dashboards', 'Learn statistics basics', 'Practise case interviews'], 'briefcase')
    add('Data Scientist', 74, 'Extend your analysis skills into machine learning.', ['Python', 'Machine learning', 'Experimentation', 'Statistics'], 'Move from describing the past to predicting the future.', ['Learn Python for data', 'Complete an ML project', 'Study experiment design', 'Practise technical interviews'], 'chart')
    add('Analytics Engineer', 70, 'Combine your technical and analytical strengths.', ['dbt', 'Data pipelines', 'SQL', 'Warehouse design'], 'Build the clean data infrastructure analysts rely on.', ['Learn data modelling', 'Build a data pipeline', 'Document a warehouse'], 'spark')
  } else if (design) {
    add('Product Designer', 82, 'Your design work maps directly to product design.', ['Figma', 'Design systems', 'User research', 'Prototyping'], 'Turn user needs into delightful, shippable designs.', ['Build a polished portfolio', 'Run 3 user interviews', 'Learn design systems', 'Practise design critiques'], 'briefcase')
    add('UX Researcher', 72, 'Your user focus is a natural fit for research work.', ['User interviews', 'Usability testing', 'Survey design'], 'Be the voice of the user on the team.', ['Plan and run studies', 'Summarise insights', 'Learn quantitative methods'], 'chart')
    add('UI Engineer', 70, 'Pair your design eye with engineering.', ['Design systems', 'Accessibility', 'HTML & CSS'], 'Bridge design and code.', ['Learn front-end fundamentals', 'Contribute to a design system', 'Build accessible components'], 'spark')
  } else {
    add(root || 'Software Engineer', 76, `Your experience aligns well with a ${root || 'software engineering'} path.`, skills.slice(0, 4).concat(['System design']), `Build on your existing strengths toward ${root || 'software engineering'}.`, ['Strengthen core fundamentals', 'Build 2 portfolio projects', 'Learn system design basics', 'Practise technical interviews'], 'briefcase')
    add('Product Manager', 70, 'Your mix of technical and soft skills supports product leadership.', ['Product strategy', 'Stakeholder management', 'Roadmapping'], 'Own outcomes, not just tasks.', ['Shadow a PM', 'Learn roadmap planning', 'Practise product case interviews'], 'chart')
    add('Technical Lead', 68, 'Your experience points toward growing into leadership.', ['Mentoring', 'Architecture', 'Code review', 'Planning'], 'Multiply your impact through the people around you.', ['Mentor a junior engineer', 'Lead a small project', 'Learn architecture patterns'], 'spark')
  }

  // If we have a concrete target role from the interview, surface it first.
  if (targetRole && !recs.some((r) => r.jobTitle.toLowerCase() === targetRole.toLowerCase())) {
    recs.unshift({
      jobTitle: targetRole,
      matchScore: clamp(78),
      rationale: `Based on your interview for ${targetRole}, this is the most relevant path for you right now.`,
      recommendedSkills: skills.slice(0, 3).concat(['Interview fundamentals']),
      summary: `You have been practising for ${targetRole} — this path keeps you focused on it.`,
      roadmap: ['Map the role’s core skills', 'Practise 3 more mock interviews', 'Build a portfolio piece', 'Apply with confidence'],
      icon: 'briefcase',
    })
  }

  return recs.slice(0, 4)
}

/**
 * Generate career recommendations with a roadmap from the resume.
 * @param {{ resumeText:string, targetRole?:string }} context
 */
export async function generateRecommendations(context) {
  const fallback = () => heuristicRecommendations(context.resumeText, context.targetRole)
  if (!client) return fallback()
  try {
    const data = await chatJson([
      { role: 'system', content: 'You are a career coach. Based on this resume, recommend 3 realistic career paths. Return ONLY JSON: {recommendations: [{job_title, match_score 0-100, rationale, recommended_skills[3-5], summary, roadmap[4-6 steps], icon one of briefcase|chart|spark}]}' },
      { role: 'user', content: (context.resumeText || '').trim().slice(0, 5000) },
    ], {
      fallbackResult: { recommendations: [] },
      maxTokens: 1500,
    })
    const list = Array.isArray(data.recommendations) ? data.recommendations : []
    if (!list.length) return fallback()
    return list.slice(0, 4).map((r) => ({
      jobTitle: String(r.job_title || '').trim(),
      matchScore: clamp(r.match_score),
      rationale: String(r.rationale || '').trim(),
      recommendedSkills: Array.isArray(r.recommended_skills) ? r.recommended_skills.map(String) : [],
      summary: String(r.summary || '').trim(),
      roadmap: Array.isArray(r.roadmap) ? r.roadmap.map(String) : [],
      icon: ['briefcase', 'chart', 'spark'].includes(r.icon) ? r.icon : 'chart',
    })).filter((r) => r.jobTitle)
  } catch {
    return fallback()
  }
}

/**
 * Coach chat: answer the candidate's questions with context from the session.
 * @param {{ targetRole:string, candidateName?:string, resumeText?:string, messages:Array<{role:'user'|'assistant', content:string}>, evaluation?:{overallScore?:number, feedback?:string}|null, nextQuestion?:string|null, conversationHistory?:Array<{role:'user'|'assistant', content:string}> }} context
 */
export async function coachReply(context) {
  const last = context.messages.at(-1)?.content
  const extra = { 
    overallScore: context.evaluation?.overallScore, 
    nextQuestion: context.nextQuestion,
    evaluationFeedback: context.evaluation?.feedback,
    conversationHistory: context.conversationHistory || context.messages
  }
  if (!client || aiUnavailable) {
    console.log('[AI] OpenAI unavailable, using fallback (coachReply)')
    return friendlyCoachReply(last, context.candidateName, extra)
  }
  const resume = (context.resumeText || '').trim().slice(0, 2500)
  const sys = resume ? `${coachPersona(context.targetRole, context.candidateName, extra)}\n\nRelevant resume background you can weave in naturally:\n${resume}` : coachPersona(context.targetRole, context.candidateName, extra)
  try {
    console.log('[AI] Calling OpenAI API (coachReply)...')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.9,
      max_tokens: 700,
      messages: [
        { role: 'system', content: sys },
        ...context.messages.slice(-12),
      ],
    })
    console.log('[AI] OpenAI response received')
    return completion.choices?.[0]?.message?.content?.trim() || 'No response.'
  } catch (error) {
    console.error('[AI] OpenAI error (coachReply):', error?.message || error)
    markUnavailable(error)
    return friendlyCoachReply(last, context.candidateName, extra)
  }
}

/**
 * Streaming coach chat: emit reply tokens as they arrive (ChatGPT-style).
 * @param {{ targetRole:string, candidateName?:string, resumeText?:string, messages:Array<{role:'user'|'assistant', content:string}>, evaluation?:{overallScore?:number, feedback?:string}|null, nextQuestion?:string|null, conversationHistory?:Array<{role:'user'|'assistant', content:string}> }} context
 * @param {(token:string)=>void} onToken
 */
export async function streamCoachReply(context, onToken) {
  const last = context.messages.at(-1)?.content
  const extra = { 
    overallScore: context.evaluation?.overallScore, 
    nextQuestion: context.nextQuestion,
    evaluationFeedback: context.evaluation?.feedback,
    conversationHistory: context.conversationHistory || context.messages
  }
  if (!client || aiUnavailable) {
    console.log('[AI] OpenAI unavailable, using fallback')
    for (const word of friendlyCoachReply(last, context.candidateName, extra).split(/(\s+)/)) onToken(word)
    return
  }
  const resume = (context.resumeText || '').trim().slice(0, 2500)
  const sys = resume ? `${coachPersona(context.targetRole, context.candidateName, extra)}\n\nRelevant resume background you can weave in naturally:\n${resume}` : coachPersona(context.targetRole, context.candidateName, extra)
  try {
    console.log('[AI] Calling OpenAI API...')
    const stream = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.9,
      max_tokens: 700,
      stream: true,
      messages: [
        { role: 'system', content: sys },
        ...context.messages.slice(-12),
      ],
    })
    console.log('[AI] Stream started')
    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content
      if (token) onToken(token)
    }
    console.log('[AI] Stream completed')
  } catch (error) {
    console.error('[AI] OpenAI error:', error?.message || error)
    markUnavailable(error)
    for (const word of friendlyCoachReply(last, context.candidateName, extra).split(/(\s+)/)) onToken(word)
  }
}

/**
 * Text-to-speech: convert text to audio using OpenAI TTS.
 * Returns a Buffer of mp3 audio, or null if unavailable.
 * @param {{ text:string, voice?:string }} options
 */
export async function generateSpeech({ text, voice = 'alloy' }) {
  if (!client || aiUnavailable) return null
  try {
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: (text || '').slice(0, 4096),
      response_format: 'mp3',
    })
    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    markUnavailable(error)
    return null
  }
}

function clamp(value, min = 0, max = 100) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 70
  return Math.min(max, Math.max(min, Math.round(n)))
}
