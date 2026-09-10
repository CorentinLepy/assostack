import { Card } from './Card'

type Props = {
  label: string
  value?: string
  hint?: string
}

export const StatCard = ({ label, value, hint }: Props) => {
  return (
    <Card className="assostack-stat-card">
      <p className="assostack-stat-card__label">{label}</p>
      {value ? <strong>{value}</strong> : <span>Donnée indisponible</span>}
      {hint ? <p className="assostack-stat-card__hint">{hint}</p> : null}
    </Card>
  )
}
