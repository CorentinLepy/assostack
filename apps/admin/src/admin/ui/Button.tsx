import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = {
  children: ReactNode
  secondary?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = ({ children, secondary, className, type = 'button', ...props }: Props) => {
  return (
    <button
      className={`assostack-button${secondary ? ' assostack-button--secondary' : ''}${className ? ` ${className}` : ''}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
