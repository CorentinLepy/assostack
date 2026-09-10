import { SearchIcon } from './icons'

type Props = {
  name: string
  defaultValue?: string
  placeholder?: string
  ariaLabel: string
}

export const SearchInput = ({ name, defaultValue, placeholder, ariaLabel }: Props) => {
  return (
    <label className="assostack-search-input">
      <SearchIcon className="assostack-search-input__icon" />
      <input
        aria-label={ariaLabel}
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        type="search"
      />
    </label>
  )
}
