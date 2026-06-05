import { Search, X } from 'lucide-react'

interface SearchBarProps { value: string; onChange: (v: string) => void; placeholder?: string }

export function SearchBar({ value, onChange, placeholder = 'Search recipes…' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" aria-hidden="true" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-warm-surface border border-warm-border rounded-xl pl-9 pr-9 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]" />
      {value && (
        <button onClick={() => onChange('')} aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-manipulation">
          <X className="w-4 h-4 text-warm-muted" />
        </button>
      )}
    </div>
  )
}
