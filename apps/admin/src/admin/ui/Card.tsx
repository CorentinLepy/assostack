import type { ReactNode } from 'react'

type Props = {
  className?: string
  children: ReactNode
}

export const Card = ({ className, children }: Props) => {
  return <article className={`assostack-card ${className ?? ''}`.trim()}>{children}</article>
}
