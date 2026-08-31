import { useEffect, useState } from 'react'
import { PageHeader, Switch, Tag } from '../../components/UI'
import { Icon } from '../../components/Icon'
import { api, clearUser } from '../../utils/api'
import { navigate } from '../../utils/navigation'

const TTS_VOICES = [
  { id: 'alloy', label: 'Alloy — Neutral, balanced' },
  { id: 'echo', label: 'Echo — Warm, conversational' },
  { id: 'fable', label: 'Fable — Expressive, storytelling' },
  { id: 'onyx', label: 'Onyx — Deep, authoritative' },
  { id: 'nova', label: 'Nova — Friendly, upbeat' },
  { id: 'shimmer', label: 'Shimmer — Soft, calm' },
]

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
]

export function Settings() {
  const [notifications, setNotifications] = useState({ feedback: true, resume: true, weekly: false, product: true })
  const [privacy, setPrivacy] = useState({ transcripts: true, recommendations: true, share: false })
  const [preferences, setPreferences] = useState({ language: 'en', timezone: 'Africa/Douala (UTC+1)', density: 'comfortable', voice: 'nova' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [confirmLogout, setConfirmLogout] = useState(false)

  const update = (setter, key, value) => setter((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    (async () => {
      try {
        const profile = await api('/api/v1/profile')
        setEmail(profile.email || '')
        const s = profile.settings || {}
        setNotifications({ feedback: true, resume: true, weekly: false, product: true, ...(s.notifications || {}) })
        setPrivacy({ transcripts: true, recommendations: true, share: false, ...(s.privacy || {}) })
        setPreferences({ language: 'en', timezone: 'Africa/Douala (UTC+1)', density: 'comfortable', voice: 'nova', ...(s.preferences || {}) })
      } catch {
        /* profile fetch is best-effort on settings page */
      }
    })()
  }, [])

  const saveChanges = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await api('/api/v1/profile/settings', {
        method: 'PUT',
        body: JSON.stringify({ notifications, privacy, preferences }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    await api('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
    clearUser()
    navigate('/login')
  }

  const notificationsOn = Object.values(notifications).some(Boolean)

  return <>
    <PageHeader eyebrow="ACCOUNT SETTINGS" title="Settings" text="Manage your notifications, privacy, and account preferences." action={<button className="button" onClick={saveChanges} disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <Icon name="check" size={15} /></button>} />
    {saved && <div className="toast success"><Icon name="check" size={15} /> Settings saved</div>}
    {error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="panel-head">
          <div><h2>Notifications</h2><p>Choose what updates you want to see.</p></div>
          <Tag tone={notificationsOn ? 'green' : ''}>{notificationsOn ? 'On' : 'Off'}</Tag>
        </div>
        <Switch label="Interview feedback alerts" description="Tell me when a session report is ready." checked={notifications.feedback} onChange={(v) => update(setNotifications, 'feedback', v)} />
        <Switch label="Resume reminders" description="Remind me to keep my resume current." checked={notifications.resume} onChange={(v) => update(setNotifications, 'resume', v)} />
        <Switch label="Weekly progress summary" description="Show my improvement at the end of each week." checked={notifications.weekly} onChange={(v) => update(setNotifications, 'weekly', v)} />
        <Switch label="Product updates" description="Occasional news about new practice features." checked={notifications.product} onChange={(v) => update(setNotifications, 'product', v)} />
      </section>
      <section className="panel settings-panel">
        <div className="panel-head">
          <div><h2>Privacy</h2><p>Control how your practice data is handled.</p></div>
          <Tag>Defaults</Tag>
        </div>
        <Switch label="Save interview transcripts" description="Use my answers to build better feedback." checked={privacy.transcripts} onChange={(v) => update(setPrivacy, 'transcripts', v)} />
        <Switch label="Personalised recommendations" description="Use my resume and role to suggest practice areas." checked={privacy.recommendations} onChange={(v) => update(setPrivacy, 'recommendations', v)} />
        <Switch label="Share anonymised stats" description="Help improve question quality with anonymous data." checked={privacy.share} onChange={(v) => update(setPrivacy, 'share', v)} />
      </section>
    </div>
    <section className="panel settings-panel">
      <div className="panel-head">
        <div><h2>Preferences</h2><p>Customise how your interview workspace feels.</p></div>
      </div>
      <div className="form-grid">
        <label className="field plain">
          <span>Language</span>
          <select value={preferences.language} onChange={(e) => update(setPreferences, 'language', e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
        <label className="field plain">
          <span>Voice</span>
          <select value={preferences.voice} onChange={(e) => update(setPreferences, 'voice', e.target.value)}>
            {TTS_VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label className="field plain">
          <span>Time zone</span>
          <select value={preferences.timezone} onChange={(e) => update(setPreferences, 'timezone', e.target.value)}>
            <option>Africa/Douala (UTC+1)</option>
            <option>Africa/Lagos (UTC+1)</option>
            <option>UTC</option>
          </select>
        </label>
        <label className="field plain">
          <span>Display density</span>
          <select value={preferences.density} onChange={(e) => update(setPreferences, 'density', e.target.value)}>
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </div>
    </section>
    <section className="panel settings-panel">
      <div className="panel-head">
        <div><h2>Account</h2><p>Security and account management.</p></div>
      </div>
      <div className="form-grid">
        <label className="field plain"><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field plain"><span>New password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current password" /></label>
      </div>
      <div className="settings-actions">
        <button className="button" onClick={saveChanges}><Icon name="lock" size={15} /> Update account</button>
        <button className="button secondary danger" onClick={() => setConfirmLogout(true)}><Icon name="logout" size={15} /> Log out</button>
      </div>
    </section>
    {confirmLogout && <div className="modal-backdrop"><section className="panel logout-modal"><h2>Log out?</h2><p>You will be returned to the login page.</p><div><button className="button secondary" onClick={() => setConfirmLogout(false)}>Cancel</button><button className="button" onClick={logout}><Icon name="logout" size={16} /> Log out</button></div></section></div>}
  </>
}
