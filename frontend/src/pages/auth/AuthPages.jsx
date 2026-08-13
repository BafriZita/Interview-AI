import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { navigate } from '../../utils/navigation'
import { api, storeUser } from '../../utils/api'
import { Link } from '../../components/Link'
import { Logo } from '../../components/Logo'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/Button'
function AuthLayout({ title, text, eyebrow, children }) { return <div className="auth-page"><header className="auth-topbar"><div className="auth-topbar-inner"><Logo/><div className="auth-top-actions"><Button to="/login" variant="nav-outline" size="sm">Log in</Button><Button to="/register" variant="nav" size="sm">Sign up</Button></div></div></header><main className="auth-main"><div className="auth-glow auth-glow-one"/><div className="auth-glow auth-glow-two"/><div className="auth-content"><div className="auth-box"><div className="auth-heading"><span className="auth-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{children}</div><div className="auth-proof"><div className="auth-avatars"><span>JN</span><span>KM</span><span>BE</span><b>+12k</b></div><p>Join 12,000+ candidates preparing for their dream roles.</p></div></div></main><footer className="auth-footer"><div><Logo/><p>© 2026 InterviewAI. Precision in preparation.</p></div><nav><a href="/#features">Features</a><a href="/#how">How it works</a><a href="#">Privacy</a><a href="#">Terms</a><a href="mailto:hello@interviewai.cm">Contact</a></nav></footer></div> }
function Field({ label, type='text', placeholder, icon, hint, value, onChange }) { const [show,setShow] = useState(false); return <label className="field"><span>{label}</span><div><Icon name={icon} size={18}/><input type={show ? 'text' : type} placeholder={placeholder} value={value} onChange={onChange}/>{type==='password'&&<button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={()=>setShow(!show)}><Icon name={show ? 'eyeOff' : 'eye'} size={17}/></button>}</div>{hint && <small className="field-note">{hint}</small>}</label> }
function ErrorBox({ message }) { return message ? <div className="auth-error"><Icon name="close" size={14}/><span>{message}</span></div> : null }

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const data = await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      storeUser(data.user)
      navigate('/home')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  return <AuthLayout eyebrow="Welcome back" title="Sign in to InterviewAI" text="Continue building the confidence for your next opportunity."><form onSubmit={submit}><Field label="Email address" type="email" placeholder="you@example.com" icon="mail" value={email} onChange={(e)=>setEmail(e.target.value)}/><Field label="Password" type="password" placeholder="Enter your password" icon="lock" value={password} onChange={(e)=>setPassword(e.target.value)}/><div className="form-row"><label><input type="checkbox"/> Remember me</label><Link to="/forgot-password">Forgot password?</Link></div><ErrorBox message={error}/><Button type="submit" full endIcon="arrow" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button></form><p className="auth-switch">New to InterviewAI? <Link to="/register">Create an account</Link></p></AuthLayout>
}

export function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('job_seeker')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (fullName.trim().length < 2) return setError('Please enter your full name.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    if (!terms) return setError('Please accept the Terms of Service.')
    setLoading(true)
    try {
      const data = await api('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ fullName, email, password, role }) })
      storeUser(data.user)
      localStorage.removeItem('interviewai.dashboardSeen')
      navigate('/home')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  return <AuthLayout eyebrow="Start for free" title="Create your account" text="Start your journey to interview mastery."><form onSubmit={submit}><Field label="Full name" placeholder="Zita" icon="user" value={fullName} onChange={(e)=>setFullName(e.target.value)}/><Field label="Email address" type="email" placeholder="name@company.com" icon="mail" value={email} onChange={(e)=>setEmail(e.target.value)}/><Field label="Password" type="password" placeholder="••••••••" icon="lock" hint="Must be at least 8 characters with a mix of letters and numbers." value={password} onChange={(e)=>setPassword(e.target.value)}/><Field label="Confirm password" type="password" placeholder="••••••••" icon="lock" value={confirm} onChange={(e)=>setConfirm(e.target.value)}/><label className="field plain"><span>I am a</span><div className="role-options">{[{v:'job_seeker',label:'Job seeker'},{v:'student',label:'Student'}].map((r) => <button type="button" key={r.v} className={role===r.v?'selected':''} onClick={()=>setRole(r.v)}>{r.label}{role===r.v && <Icon name="check" size={14}/>}</button>)}</div></label><label className="terms"><input type="checkbox" checked={terms} onChange={(e)=>setTerms(e.target.checked)}/> <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</span></label><ErrorBox message={error}/><Button type="submit" full endIcon="arrow" disabled={loading}>{loading ? 'Creating account…' : 'Register'}</Button></form><p className="auth-switch">Already have an account? <Link to="/login">Login</Link></p></AuthLayout>
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      setSent(true)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  return <AuthLayout eyebrow="Account recovery" title={sent?'Check your email':'Reset your password'} text={sent?'We sent a reset link to your inbox.':"Enter your email and we'll send you a secure reset link."}>{sent?<div className="success-message"><span><Icon name="check"/></span><p>The link expires in 30 minutes.</p><Button to="/login" full>Back to sign in</Button></div>:<form onSubmit={submit}><Field label="Email address" type="email" placeholder="you@example.com" icon="mail" value={email} onChange={(e)=>setEmail(e.target.value)}/><ErrorBox message={error}/><Button type="submit" full disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</Button><p className="auth-switch"><Link to="/login">← Back to sign in</Link></p></form>}</AuthLayout>
}

function parseRecoveryHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return { accessToken: params.get('access_token'), refreshToken: params.get('refresh_token') }
}

export function ResetPassword() {
  const [supabase] = useState(() => createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY))
  const [status, setStatus] = useState('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    (async () => {
      const { accessToken, refreshToken } = parseRecoveryHash()
      if (!accessToken) return setStatus('invalid')
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      setStatus(error ? 'invalid' : 'ready')
    })()
  }, [supabase])
  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(error.message)
    await supabase.auth.signOut().catch(() => {})
    setStatus('done')
  }
  const title = status === 'done' ? 'Password updated' : status === 'invalid' ? 'Invalid reset link' : 'Set a new password'
  const text = status === 'done' ? 'Your password was reset successfully.' : status === 'invalid' ? 'This link is invalid or has expired. Request a new reset link.' : 'Choose a new password for your account.'
  return <AuthLayout eyebrow="Account recovery" title={title} text={text}>
    {status === 'done' && <div className="success-message"><span><Icon name="check"/></span><p>You can now sign in with your new password.</p><Button to="/login" full>Back to sign in</Button></div>}
    {status === 'invalid' && <div className="success-message"><Button to="/forgot-password" full>Request a new link</Button></div>}
    {status === 'ready' && <form onSubmit={submit}><Field label="New password" type="password" placeholder="••••••••" icon="lock" hint="Must be at least 8 characters." value={password} onChange={(e)=>setPassword(e.target.value)}/><Field label="Confirm new password" type="password" placeholder="••••••••" icon="lock" value={confirm} onChange={(e)=>setConfirm(e.target.value)}/><ErrorBox message={error}/><Button type="submit" full disabled={loading}>{loading ? 'Updating…' : 'Update password'}</Button></form>}
  </AuthLayout>
}
