import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export const FilterBar = ({ children }: Props) => {
  return <div className="assostack-filter-bar">{children}</div>
}
