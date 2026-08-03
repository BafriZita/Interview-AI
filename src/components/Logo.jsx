import { Link } from './Link'
export function Logo({ light = false }) { return <Link to="/" className={`logo ${light ? 'logo-light' : ''}`}><span className="logo-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M9 7v10a7 7 0 0 0 14 0V7" /><path d="M7 12h18M12 25h8" /></svg></span><span className="logo-name">Interview<span>AI</span></span></Link> }
