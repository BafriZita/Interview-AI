function shuffle(list) {
  const arr = list.slice()
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const bank = {
  hr: [
    'Tell me about yourself and why this role interests you.',
    'What professional achievement are you most proud of, and why?',
    'Why do you want to work at this company specifically?',
    'Walk me through your resume in under two minutes — what are the highlights?',
    'What are you looking for in your next role that your current one is missing?',
    'Tell me about a time you went above and beyond your job description.',
    'Where do you see yourself in three years, and how does this role fit in?',
    'What do you know about our product, and what excites you about it?',
    'How do you handle working under pressure? Give me a real example.',
    'What is the one thing you would change about how you worked last year?',
    'Describe your ideal manager and how you like to receive feedback.',
    'Why should we hire you over someone with a similar background?',
  ],
  behavioral: [
    'Tell me about a difficult team situation and how you handled it.',
    'Describe a time you received challenging feedback and what you did with it.',
    'Tell me about a conflict with a colleague and how you resolved it.',
    'Describe a time you had to persuade someone who disagreed with you.',
    'Tell me about a time you made a mistake at work and what you learned.',
    'Describe a situation where you had to motivate a struggling teammate.',
    'Tell me about a time you disagreed with your manager and stood your ground.',
    'Describe a moment when you had to adapt to a sudden change at work.',
    'Tell me about a time you took a risk that did not pay off.',
    'Describe a situation where you had to deliver bad news to a stakeholder.',
    'Tell me about a time you prioritised one project over another and why.',
    'Describe a time you held someone accountable, even though it was awkward.',
  ],
  technical: [
    'Walk me through a technically challenging project you built.',
    'How do you diagnose and improve application performance?',
    'Explain a complex technical concept to a non-technical stakeholder.',
    'Tell me about a time you refactored code for the better — what guided your choices?',
    'How do you decide between a quick solution and the "right" solution?',
    'Describe how you debug a production issue when you have no stack trace.',
    'How do you design for scale? Walk me through your thought process.',
    'Tell me about a time you had to learn a brand-new technology quickly.',
    'How do you write code that is easy for the next developer to maintain?',
    'Describe your approach to testing: unit, integration, and end-to-end.',
    'How do you review a pull request and what do you look for first?',
    'Tell me about a time your technical design was challenged and changed.',
  ],
  situational: [
    'What would you do if a deadline was at risk?',
    'How would you handle unclear requirements from a stakeholder?',
    'What do you do when two managers ask you for the same hours?',
    'A teammate on the critical path is stuck. How do you help without doing their work?',
    'Your code just broke production. What is your first move?',
    'A client asks for a feature you know is a bad idea. What do you do?',
    'How would you handle joining a project with no documentation?',
    'Your manager is on vacation and a decision needs to happen today. What now?',
    'A colleague quietly stopped contributing. How do you handle it?',
    'You find a security flaw that nobody else has noticed. What do you do?',
    'The scope keeps growing and the deadline is fixed. How do you respond?',
    'You discover your team is about to ship something untested. What do you do?',
  ],
  problem_solving: [
    'Describe your process when facing a problem you have never seen before.',
    'How do you compare solutions with different trade-offs?',
    'Tell me about a time you simplified a complicated system.',
    'How do you break a large, vague problem into small actionable steps?',
    'Describe a time your first solution failed and what you did next.',
    'How do you validate an assumption before acting on it?',
    'Tell me about a time you solved a problem with an unexpected root cause.',
    'How do you know when to stop analysing and start shipping?',
    'Describe a time you used data to make a decision you were unsure about.',
    'How do you handle a problem with no obvious owner and a stalled team?',
    'Tell me about a time you turned a vague idea into a working plan.',
    'How do you choose what NOT to build? Walk me through your reasoning.',
  ],
}

export function buildQuestionSet(type = 'mixed', count = 8) {
  const groups = type === 'mixed'
    ? Object.entries(bank)
    : [[type, bank[type] || bank.hr]]
  const all = groups.flatMap(([questionType, questions]) =>
    shuffle(questions).map((questionText) => ({ questionType, questionText: cap(questionText) })),
  )
  const picked = []
  for (let i = 0; i < count; i += 1) {
    picked.push(all[i % all.length])
  }
  return picked
}
