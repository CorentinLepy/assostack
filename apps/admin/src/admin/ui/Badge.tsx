type Props = {
  tone?: 'neutral' | 'accent'
  children: string
}

export const Badge = ({ tone = 'neutral', children }: Props) => {
  return <span className={`assostack-badge assostack-badge--${tone}`}>{children}</span>
}
