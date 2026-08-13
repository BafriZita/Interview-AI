import { Link } from '../../components/Link'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/Button'

const features = [
  { icon: 'file', tone: 'blue', title: 'Role-aware practice', text: 'Upload your resume and the job description. InterviewPrep creates role-specific questions that actually matter.' },
  { icon: 'chart', tone: 'violet', title: 'Instant feedback', text: 'Get a clear score for your content, tone, clarity, and delivery immediately after every answer.' },
  { icon: 'spark', tone: 'cyan', title: 'Behavioural analysis', text: 'Master the STAR method with practical, AI-guided storytelling frameworks for tough questions.' },
]

const testimonials = [
  ['SN', 'Sarah N.', 'Software Engineer at MTN', '“The feedback on my technical explanations was a game-changer. I landed my dream role after four mock sessions.”'],
  ['MC', 'Marcus C.', 'Product Manager', '“I struggled with behavioural questions for years. The framework approach helped me structure my thoughts perfectly.”'],
  ['ER', 'Elena R.', 'Marketing Lead', '“Interviewing used to be stressful. Practising with InterviewPrep made it feel like a breeze.”'],
]

function HeroVisual() {
  return <div className="hero-visual" aria-label="InterviewPrep feedback preview">
    <div className="visual-halo" />
    <div className="ai-panel">
      <div className="panel-topbar"><div className="panel-dots"><i /><i /><i /></div><span>InterviewPrep <em>● Live session</em></span><Icon name="chart" size={16} /></div>
      <div className="panel-body">
        <div className="panel-intro"><div className="coach-avatar">AI</div><div><b>Tell me about a project where you solved a difficult technical problem.</b><small>Question 03 of 08 · Technical interview</small></div></div>
        <div className="voice-card"><div className="voice-head"><span><i className="pulse" /> Listening to your answer</span><time>01:24</time></div><div className="waveform">{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ '--bar': `${22 + ((index * 17) % 55)}%` }} />)}</div><div className="voice-foot"><span>00:00</span><button aria-label="Microphone"><Icon name="mic" size={18} /></button><span>03:00</span></div></div>
        <div className="panel-bottom"><span><Icon name="check" size={14} /> Resume matched</span><span>Question difficulty <b>Advanced</b></span></div>
      </div>
    </div>
    <div className="feedback-card"><div className="feedback-icon"><Icon name="chart" size={17} /></div><div><small>Coach note</small><p>Strong leadership. Add a specific metric to make this answer <b>40% more impactful.</b></p></div></div>
    <div className="score-card"><strong>85%</strong><span>Confidence<br />score</span><i><Icon name="arrow" size={13} /></i></div>
  </div>
}

export function Landing() {
  return <>
    <main className="landing-page">
      <section className="landing-hero">
        <div className="container hero-layout">
          <div className="hero-content">
            <span className="eyebrow-badge"><i /> Career confidence</span>
            <h1>Prepare smarter.<br /><span>Interview better.</span></h1>
            <p className="hero-lede">Master your next interview with personalised mock sessions, real-time feedback, and resume-tailored practice questions.</p>
            <div className="hero-cta"><Button to="/register" className="primary-button" endIcon="arrow">Start preparing free</Button><Button href="#how" variant="outline" className="outline-button">See how it works</Button></div>
            <div className="hero-trust"><div className="mini-avatars"><span>JN</span><span>KM</span><span>BE</span><span>+</span></div><div><strong>4.9/5</strong> from 1,200+ learners <span className="stars">★★★★★</span></div></div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="trust-strip"><div className="container"><p>Trusted by ambitious professionals from</p><div className="company-row"><b>MTN</b><b>Orange</b><b>afriland</b><b>CAMTEL</b><b>UBA</b><b>Jumia</b></div></div></section>

      <section id="features" className="landing-section feature-section"><div className="container"><div className="center-heading"><span className="section-kicker">Everything you need</span><h2>Build confidence that shows.</h2><p>One intelligent workspace for every step between your CV and the job offer.</p></div><div className="feature-grid">{features.map((feature) => <article className={`feature-card ${feature.tone}`} key={feature.title}><div className="feature-icon"><Icon name={feature.icon} /></div><h3>{feature.title}</h3><p>{feature.text}</p><a href="#how">Learn more <Icon name="arrow" size={15} /></a></article>)}<article className="feature-card performance-card"><div><span className="section-kicker light-kicker">Progress you can see</span><h3>Detailed performance reports</h3><p>Track your growth over time and see how your confidence improves with every session.</p><Link to="/register" className="text-button">View a sample report <Icon name="arrow" size={15} /></Link></div><div className="mini-chart"><div className="chart-label"><span>Confidence score</span><b>85%</b></div><div className="chart-area"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="chart-axis"><span>Week 1</span><span>Week 4</span></div></div></article></div></div></section>

      <section id="how" className="landing-section how-section"><div className="container"><div className="center-heading"><span className="section-kicker">How it works</span><h2>Three steps to interview-ready.</h2></div><div className="steps"><div className="step-line" />{[['01', 'Upload your resume', 'Share your experience and the role you are targeting.'], ['02', 'Practise with AI', 'Engage in realistic mock interviews across any device.'], ['03', 'Get hired', 'Apply the insights and walk into the room with confidence.']].map(([number, title, text]) => <div className="step" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>

      <section id="about" className="proof-section"><div className="container proof-box"><div className="proof-copy"><span className="section-kicker light-kicker">Made for your next opportunity</span><h2>Built for people who don’t settle for average.</h2><ul><li><Icon name="check" size={18} /><span><b>Personalised practice</b> built around your story, skills, and target role.</span></li><li><Icon name="check" size={18} /><span><b>Real interview confidence</b> through repeated, safe exposure.</span></li><li><Icon name="check" size={18} /><span><b>Actionable feedback</b> you can use in your very next answer.</span></li></ul></div><div className="stat-grid"><div><strong>85%</strong><span>Confidence increase</span></div><div><strong>3x</strong><span>Faster prep time</span></div><div><strong>10k+</strong><span>Sessions completed</span></div><div><strong>24/7</strong><span>Practice support</span></div></div></div></section>

      <section className="landing-section testimonial-section"><div className="container"><div className="center-heading"><span className="section-kicker">Success stories</span><h2>Small practice. Big breakthroughs.</h2></div><div className="testimonial-grid">{testimonials.map(([initials, name, role, quote]) => <article className="testimonial" key={name}><div className="person"><span>{initials}</span><div><b>{name}</b><small>{role}</small></div></div><p>{quote}</p><div className="quote-stars">★★★★★</div></article>)}</div></div></section>

      <section className="landing-section faq-section"><div className="container faq-container"><div className="center-heading"><span className="section-kicker">Questions, answered</span><h2>Frequently asked questions.</h2></div><div className="faq-list"><details open><summary>Is InterviewPrep specialised for technical roles?<span>+</span></summary><p>Yes. InterviewPrep adapts to software engineering, product, marketing, finance, and many other high-demand roles.</p></details><details><summary>Can I use it for free?<span>+</span></summary><p>Absolutely. Every new user gets two full-length mock interviews with reports and feedback.</p></details><details><summary>Does it record my sessions?<span>+</span></summary><p>Sessions are transcribed for analysis, and you have full control over your data. You can delete them at any time.</p></details></div></div></section>
    </main>
    <footer id="contact" className="landing-footer"><div className="container footer-top"><div className="footer-brand"><div className="footer-wordmark">Interview<span>Prep</span></div><p>Precision in preparation.<br />Built for better interviews.</p></div><div className="footer-links"><div><b>Product</b><a href="#features">Features</a><a href="#how">How it works</a><Link to="/register">Get started</Link></div><div><b>Company</b><a href="#about">About us</a><a href="mailto:hello@interviewai.cm">Contact</a><a href="#">Privacy</a></div><div><b>Based in</b><p>Yaounde, Cameroon<br />Made for Africa & beyond</p></div></div></div><div className="container footer-bottom"><span>© 2026 InterviewPrep. Made with purpose in Cameroon.</span><span>English · Français</span></div></footer>
  </>
}
