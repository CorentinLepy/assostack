type Tab = {
  label: string
  href: string
  isActive: boolean
}

type Props = {
  tabs: Tab[]
  ariaLabel: string
}

export const Tabs = ({ tabs, ariaLabel }: Props) => {
  return (
    <nav aria-label={ariaLabel} className="assostack-tabs">
      {tabs.map((tab) => (
        <a
          aria-current={tab.isActive ? 'page' : undefined}
          className={`assostack-tab${tab.isActive ? ' assostack-tab--active' : ''}`}
          href={tab.href}
          key={tab.href}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  )
}
