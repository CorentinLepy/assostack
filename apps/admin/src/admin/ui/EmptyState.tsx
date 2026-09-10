type Props = {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}

export const EmptyState = ({ title, description, actionHref, actionLabel }: Props) => {
  return (
    <div className="assostack-empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {actionHref && actionLabel ? (
        <a className="assostack-link-button" href={actionHref}>
          {actionLabel}
        </a>
      ) : null}
    </div>
  )
}
