import type { ReactNode } from 'react'

type Props = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  headingId?: string
}

export const PageHeader = ({ eyebrow, title, description, actions, headingId }: Props) => {
  return (
    <header className="assostack-page-header">
      <div>
        {eyebrow ? <p className="assostack-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 id={headingId}>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="assostack-page-header__actions">{actions}</div> : null}
    </header>
  )
}
