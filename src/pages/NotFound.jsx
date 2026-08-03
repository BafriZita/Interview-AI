import { Link } from '../components/Link'
import { Logo } from '../components/Logo'
export function NotFound(){return <main className="not-found"><Logo/><strong>404</strong><h1>This page stepped out for an interview.</h1><p>The route you requested doesn’t exist.</p><Link to="/" className="button">Return home</Link></main>}
