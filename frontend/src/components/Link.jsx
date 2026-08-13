import { navigate } from '../utils/navigation'

export function Link({ to, children, className = '', ...props }) {
  return <a href={to} className={className} {...props} onClick={(event) => { props.onClick?.(event); if (event.defaultPrevented) return; event.preventDefault(); navigate(to) }}>{children}</a>
}
