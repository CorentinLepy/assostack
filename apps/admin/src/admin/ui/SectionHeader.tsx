type Props = {
  eyebrow?: string
  title: string
  description?: string
  headingId?: string
}

export const SectionHeader = ({ eyebrow, title, description, headingId }: Props) => {
  return (
    <div className="assostack-section-header">
      {eyebrow ? <p>{eyebrow}</p> : null}
      <h2 id={headingId}>{title}</h2>
      {description ? <p className="assostack-section-header__description">{description}</p> : null}
    </div>
  )
}
