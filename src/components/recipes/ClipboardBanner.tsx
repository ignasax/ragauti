import { Link as LinkIcon } from 'lucide-react'

interface ClipboardBannerProps {
  url: string
  onExtract: (url: string) => void
  onDismiss: () => void
}

export function ClipboardBanner({ url, onExtract, onDismiss }: ClipboardBannerProps) {
  return (
    <div className="flex items-center gap-3 bg-warm-surface border border-warm-border rounded-xl px-4 py-3">
      <LinkIcon className="w-4 h-4 text-warm-accent flex-shrink-0" aria-hidden="true" />
      <p className="font-sans text-sm text-warm-secondary flex-1 min-w-0 truncate">
        Found a link — extract recipe?
      </p>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => onExtract(url)}
          className="font-sans text-sm font-semibold text-warm-accent min-h-[36px] px-2 cursor-pointer touch-manipulation">
          Extract
        </button>
        <button onClick={onDismiss} aria-label="Dismiss"
          className="font-sans text-sm text-warm-muted min-h-[36px] px-2 cursor-pointer touch-manipulation">
          ✕
        </button>
      </div>
    </div>
  )
}
