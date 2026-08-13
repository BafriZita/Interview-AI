import { Icon } from './Icon'

export function PageHeader({ eyebrow, title, text, action }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</div> }
export function Stat({ icon, value, label, trend }) { return <div className="stat-card"><span className="stat-icon"><Icon name={icon}/></span><div><strong>{value}</strong><p>{label}</p></div>{trend && <span className="trend">{trend}</span>}</div> }
export function Progress({ value, color = 'blue' }) { return <div className="progress"><i className={color} style={{width:`${value}%`}} /></div> }
export function UploadBox({ title = 'Drop your file here', text = 'PDF, DOC or DOCX • Max 10 MB', onChoose }) { return <div className="upload-box"><span><Icon name="upload" size={26}/></span><h3>{title}</h3><p>{text}</p><button className="button secondary" onClick={onChoose}>Choose file</button></div> }
export function Tag({ children, tone='' }) { return <span className={`tag ${tone}`}>{children}</span> }
export function Switch({ checked = false, onChange, label, description }) {
  return <label className="setting-row">
    <span className="setting-copy"><b>{label}</b>{description && <small>{description}</small>}</span>
    <span className="switch"><input type="checkbox" checked={checked} onChange={(event) => onChange?.(event.target.checked)} /><i /></span>
  </label>
}
