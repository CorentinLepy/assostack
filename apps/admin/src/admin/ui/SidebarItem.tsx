import type { ReactNode } from 'react'

type Props = {
  href: string
  label: string
  icon: ReactNode
  isActive: boolean
}

export const SidebarItem = ({ href, label, icon, isActive }: Props) => {
  return (
    <a aria-current={isActive ? 'page' : undefined} className="assostack-sidebar-item" href={href}>
      <span className="assostack-sidebar-item__icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </a>
  )
}
