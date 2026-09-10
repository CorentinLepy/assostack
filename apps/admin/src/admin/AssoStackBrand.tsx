type MarkProps = {
  className?: string
  label?: string
  size?: number
}

export const AssoStackMark = ({ className, label = 'AssoStack', size = 24 }: MarkProps) => (
  <svg
    aria-label={label}
    className={className}
    fill="none"
    height={size}
    role="img"
    viewBox="0 0 32 32"
    width={size}
  >
    <rect fill="#DCFCE7" height="32" rx="8" width="32" />
    <path
      d="M10.5 11.25L16 8l5.5 3.25v6.5L16 21l-5.5-3.25v-6.5z"
      stroke="#166534"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <circle cx="16" cy="16" fill="#22C55E" r="2.25" />
    <path d="M13.25 13.8L16 16" stroke="#166534" strokeLinecap="round" strokeWidth="1.75" />
    <path d="M18.75 13.8L16 16" stroke="#166534" strokeLinecap="round" strokeWidth="1.75" />
    <path d="M13.25 18.2L16 16" stroke="#166534" strokeLinecap="round" strokeWidth="1.75" />
    <path d="M18.75 18.2L16 16" stroke="#166534" strokeLinecap="round" strokeWidth="1.75" />
  </svg>
)

export const AssoStackLogo = () => (
  <span className="assostack-brand assostack-brand--logo" aria-label="AssoStack">
    <AssoStackMark className="assostack-brand__mark" size={32} />
    <span>AssoStack</span>
  </span>
)

export const AssoStackIcon = () => <AssoStackMark className="assostack-brand__icon" size={24} />
