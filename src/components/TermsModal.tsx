import { X } from 'lucide-react'

interface Props { onClose: () => void }

export function TermsModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-warm-primary/30 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div
        className="bg-warm-card w-full rounded-t-2xl flex flex-col max-h-[85vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-warm-border shrink-0">
          <h2 className="font-serif text-lg font-bold text-warm-primary">Terms of Service</h2>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center text-warm-secondary cursor-pointer touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4 font-sans text-sm text-warm-primary leading-relaxed">
          <p className="text-warm-muted text-xs">Last updated: June 2026</p>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">1. Free Personal Use</h3>
            <p>Ragauti is a free, personal recipe manager. You may use it for personal, non-commercial purposes. Redistribution, resale, or use as part of a commercial product is not permitted.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">2. Your Content</h3>
            <p>You own all recipes, meal plans, and notes you create. By using Ragauti you grant us a limited licence to store and display your content solely to provide the service to you.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">3. AI Features &amp; API Keys</h3>
            <p>AI-powered recipe extraction requires your own API key from Groq or Google. You are responsible for obtaining and securing that key and for any usage costs or terms imposed by those providers. We never use your key except to call the AI provider on your behalf in your browser.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">4. No Warranty</h3>
            <p>The service is provided "as is" without any warranty of any kind. We do not guarantee uptime, data durability, or continued availability. Use at your own risk.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">5. Acceptable Use</h3>
            <p>You agree not to misuse the service — including attempting to scrape, attack, or abuse the platform or the third-party services it relies on.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">6. Changes &amp; Termination</h3>
            <p>We may update these terms or discontinue the service at any time. Continued use after changes constitutes acceptance. You may stop using the service and request deletion of your data at any time.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">7. Contact</h3>
            <p>Questions or data deletion requests: open an issue at the project repository or email the listed maintainer.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
