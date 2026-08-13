import { Link } from './Link'
import { Icon } from './Icon'

export function Button({ children, to, href, variant = 'primary', size = 'md', endIcon = null, full = false, className = '', ...props }) {
  const classes = `button button-component button-${variant} button-${size}${full ? ' button-full' : ''}${className ? ` ${className}` : ''}`
  const content = <>{children}{endIcon && <Icon name={endIcon} size={16} />}</>

  if (to) return <Link to={to} className={classes} {...props}>{content}</Link>
  if (href) return <a href={href} className={classes} {...props}>{content}</a>
  return <button className={classes} {...props}>{content}</button>
}
