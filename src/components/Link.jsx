import { navigate } from '../utils/navigation'

export function Link({ to, children, className = '', ...props }) {
  return <a href={to} className={className} onClick={(event) => { event.preventDefault(); navigate(to) }} {...props}>{children}</a>
}
