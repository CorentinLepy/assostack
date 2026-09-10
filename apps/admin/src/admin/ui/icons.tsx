type IconProps = {
  className?: string
}

export const HomeIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path d="M4 10.5L12 4l8 6.5V20H4v-9.5z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9.5 20v-5h5v5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)

export const UsersIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M3.5 19c.7-2.3 2.5-3.8 5.5-3.8S13.8 16.7 14.5 19"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <circle cx="16.5" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M14.8 16.1c1.7.2 2.9 1 3.7 2.3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)

export const FileIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path d="M7 3.8h7l3 3V20H7V3.8z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M14 3.8V7h3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9.5 11.2h5M9.5 14.2h5M9.5 17.2h5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)

export const SettingsIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M19.2 13.1v-2.2l-1.9-.5a5.7 5.7 0 00-.5-1.2l1-1.7-1.6-1.6-1.7 1a5.7 5.7 0 00-1.2-.5L13.1 4h-2.2l-.5 1.9a5.7 5.7 0 00-1.2.5l-1.7-1-1.6 1.6 1 1.7a5.7 5.7 0 00-.5 1.2L4 10.9v2.2l1.9.5c.1.4.3.8.5 1.2l-1 1.7 1.6 1.6 1.7-1c.4.2.8.4 1.2.5l.5 1.9h2.2l.5-1.9c.4-.1.8-.3 1.2-.5l1.7 1 1.6-1.6-1-1.7c.2-.4.4-.8.5-1.2l1.9-.5z"
      stroke="currentColor"
      strokeWidth="1.3"
    />
  </svg>
)

export const SearchIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
    <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)

export const BellIcon = ({ className }: IconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      d="M6.5 9.8c0-3.1 2.2-5.3 5.5-5.3s5.5 2.2 5.5 5.3V14l1.5 2.5H5L6.5 14V9.8z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M10.1 18c.5 1 1.1 1.5 1.9 1.5s1.4-.5 1.9-1.5"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
)
