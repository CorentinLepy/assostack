import type { ReactNode } from 'react'

type Props = {
  href: string
  children: ReactNode
  secondary?: boolean
}

export const LinkButton = ({ href, children, secondary }: Props) => {
  return (
    <a
      className={`assostack-link-button${secondary ? ' assostack-link-button--secondary' : ''}`}
      href={href}
    >
      {children}
    </a>
  )
}
