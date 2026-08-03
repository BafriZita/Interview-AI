import { useState } from 'react'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { Button } from './Button'
export function PublicShell({ children }) {
  const [open, setOpen] = useState(false)
  return <div className="public-site"><header className="public-nav container"><Logo /><button className="mobile-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Icon name={open ? 'close' : 'menu'} /></button><nav className={open ? 'open' : ''}><a href="/#features">Features</a><a href="/#how">How it works</a><a href="/#about">About</a><a href="/#contact">Contact</a><div className="nav-actions"><Button to="/login" variant="nav-outline" size="sm">Log in</Button><Button to="/register" variant="nav" size="sm">Get started</Button></div></nav></header>{children}</div>
}
