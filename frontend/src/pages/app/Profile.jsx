import { useEffect, useRef, useState } from 'react'
import { navigate } from '../../utils/navigation'
import { api, apiUpload, clearUser } from '../../utils/api'
import { Icon } from '../../components/Icon'
import { PageHeader, Tag } from '../../components/UI'

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('interviewai.user') || '{}')
  } catch {
    return {}
  }
}

function roleLabel(role) {
  return role === 'student' ? 'Student' : role === 'job_seeker' ? 'Job seeker' : 'Job seeker'
}

export function Profile() {
  const [tab, setTab] = useState('personal')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [photo, setPhoto] = useState(localStorage.getItem('interviewai.profilePhoto') || '')
  const [resumeName, setResumeName] = useState(localStorage.getItem('interviewai.resumeName') || 'No resume uploaded yet')
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ fullName: '', phone: '', bio: '', preferredJobRole: '' })
  const [role, setRole] = useState(getUser().role || 'job_seeker')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const photoInput = useRef(null)
  const resumeInput = useRef(null)
  const user = getUser()
  const name = user.fullName || user.username || localStorage.getItem('interviewai.username') || 'Zita'
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/api/v1/profile')
        setProfile(data)
        setRole(data.role || getUser().role || 'job_seeker')
        setForm({
          fullName: data.full_name || '',
          phone: data.phone || '',
          bio: data.bio || '',
          preferredJobRole: data.preferred_job_role || '',
        })
        if (data.email) {
          const stored = getUser()
          localStorage.setItem('interviewai.user', JSON.stringify({ ...stored, email: data.email, role: data.role || stored.role }))
        }
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [])

  const uploadPhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      localStorage.setItem('interviewai.profilePhoto', reader.result)
      setPhoto(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const uploadResume = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const result = await apiUpload('/api/v1/resumes', 'resume', file)
      localStorage.setItem('interviewai.resumeName', result.originalName)
      setResumeName(result.originalName)
    } catch (err) {
      setError(err.message)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const payload = {
        fullName: form.fullName || name,
        phone: form.phone || null,
        bio: form.bio || null,
        preferredJobRole: form.preferredJobRole || null,
        role,
      }
      await api('/api/v1/profile', { method: 'PUT', body: JSON.stringify(payload) })
      const stored = getUser()
      localStorage.setItem('interviewai.user', JSON.stringify({ ...stored, fullName: form.fullName || name, role }))
      localStorage.setItem('interviewai.username', form.fullName || name)
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

  return <>
    <PageHeader eyebrow="YOUR ACCOUNT" title="Profile" text="Keep your personal information and documents ready for interview practice." />
    {error && <div className="auth-error"><Icon name="close" size={14} /><span>{error}</span></div>}
    {saved && <div className="toast success"><Icon name="check" size={15} /> Profile saved</div>}
    <div className="profile-layout">
      <aside className="panel profile-card">
        <button className="large-avatar avatar-upload" onClick={() => photoInput.current?.click()} aria-label="Upload profile photo"><span className="avatar-frame">{photo ? <img src={photo} alt="Profile photo" /> : <span className="avatar-initials">{initials}</span>}</span><span className="avatar-badge">+</span></button>
        <input ref={photoInput} type="file" accept="image/*" hidden onChange={uploadPhoto} />
        <h2>{profile?.full_name || name}</h2>
        <p>{roleLabel(role)}</p>
        <Tag tone="green">Profile active</Tag>
        <hr />
        <button className={`profile-tab ${tab === 'personal' ? 'active' : ''}`} onClick={() => setTab('personal')}>Personal information</button>
        <button className={`profile-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => navigate('/settings')}>Settings</button>
        <button className={`profile-tab ${tab === 'resume' ? 'active' : ''}`} onClick={() => setTab('resume')}>Resume</button>
        <button className="profile-tab logout-tab" onClick={() => setConfirmLogout(true)}><Icon name="logout" size={15} /> Logout</button>
      </aside>
      {tab === 'personal' && <section className="panel profile-form"><div className="panel-head"><div><h2>Personal information</h2><p>Update your personal details here.</p></div><button className="button" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div><div className="form-grid"><label className="field plain"><span>Full name</span><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label><label className="field plain"><span>Email address</span><input value={profile?.email || ''} disabled /></label><label className="field plain"><span>Phone number</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="field plain"><span>Preferred job role</span><input value={form.preferredJobRole} onChange={(e) => setForm({ ...form, preferredJobRole: e.target.value })} /></label></div><label className="field plain"><span>I am a</span><div className="role-options">{[{ v: 'job_seeker', label: 'Job seeker' }, { v: 'student', label: 'Student' }].map((r) => <button type="button" key={r.v} className={role === r.v ? 'selected' : ''} onClick={() => setRole(r.v)}>{r.label}{role === r.v && <Icon name="check" size={14} />}</button>)}</div></label><label className="field plain"><span>Professional bio</span><textarea rows="4" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label></section>}
      {tab === 'resume' && <section className="panel profile-form"><div className="panel-head"><div><h2>Resume</h2><p>Upload or replace the resume connected to your profile.</p></div><button className="button" onClick={() => resumeInput.current?.click()}><Icon name="upload" size={16} /> Upload resume</button></div><input ref={resumeInput} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={uploadResume} /><div className="file-card"><span>CV</span><div><strong>{resumeName}</strong><small>PDF, DOC, and DOCX supported</small></div><b>✓</b></div></section>}
    </div>
    {confirmLogout && <div className="modal-backdrop"><section className="panel logout-modal"><h2>Log out?</h2><p>You will be returned to the login page. Your uploaded files and saved feedback stay on this device.</p><div><button className="button secondary" onClick={() => setConfirmLogout(false)}>Cancel</button><button className="button" onClick={logout}><Icon name="logout" size={16} /> Log out</button></div></section></div>}
  </>
}
