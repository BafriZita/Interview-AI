const bank={
  hr:['Tell me about yourself and why this role interests you.','What professional achievement are you most proud of?'],
  behavioral:['Tell me about a difficult team situation and how you handled it.','Describe a time you received challenging feedback.'],
  technical:['Walk me through a technically challenging project you built.','How do you diagnose and improve application performance?'],
  situational:['What would you do if a deadline was at risk?','How would you handle unclear requirements from a stakeholder?'],
  problem_solving:['Describe your process when facing a problem you have never seen before.','How do you compare solutions with different trade-offs?'],
}
export function buildQuestionSet(type='mixed',count=8){const groups=type==='mixed'?Object.entries(bank):[[type,bank[type]||bank.hr]];const all=groups.flatMap(([questionType,questions])=>questions.map(questionText=>({questionType,questionText})));return Array.from({length:count},(_,index)=>all[index%all.length])}
