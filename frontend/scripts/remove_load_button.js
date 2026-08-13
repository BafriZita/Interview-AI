const fs = require('fs');
const p = 'c:/Users/LENV/Desktop/InterviewAI/InterviewAI/Interview-AI/src/pages/app/History.jsx';
let s = fs.readFileSync(p,'utf8');
const toRemove = '<div className="history-load"><button className="button secondary"><Icon name="arrow" size={15}/> Load previous sessions</button></div>';
if (s.includes(toRemove)) {
  s = s.replace(toRemove, '');
  fs.writeFileSync(p, s, 'utf8');
  console.log('REMOVED');
} else {
  console.log('NOT FOUND');
}
