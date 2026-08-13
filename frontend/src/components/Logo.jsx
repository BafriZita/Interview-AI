import { Link } from './Link'
export function Logo({ light = false }) { return <Link to="/" className={`logo ${light ? 'logo-light' : ''}`}><span className="logo-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M8 8h16v12H8z" /><path d="M11 24h10M12 13h8M12 17h5" /></svg></span><span className="logo-name">Interview<span>Prep</span></span></Link> }
