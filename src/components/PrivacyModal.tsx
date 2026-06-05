import { X } from 'lucide-react'

interface Props { onClose: () => void }

export function PrivacyModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-warm-primary/30 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div
        className="bg-warm-card w-full rounded-t-2xl flex flex-col max-h-[85vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-warm-border shrink-0">
          <h2 className="font-serif text-lg font-bold text-warm-primary">Privacy Policy</h2>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center text-warm-secondary cursor-pointer touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4 font-sans text-sm text-warm-primary leading-relaxed">
          <p className="text-warm-muted text-xs">Last updated: June 2026</p>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">What we collect</h3>
            <ul className="flex flex-col gap-1 text-warm-secondary list-disc list-inside">
              <li>Your Google name, email address, and profile photo (from Google sign-in)</li>
              <li>Recipes, meal plans, and grocery lists you create</li>
              <li>Your AI provider API key, if you choose to add one</li>
            </ul>
            <p className="mt-2">We do not collect usage analytics, device identifiers, IP addresses, or any advertising data.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">How it's stored</h3>
            <p>All data is stored in <strong>Supabase</strong> (PostgreSQL), encrypted at rest. Your data is isolated to your account using Row Level Security — no other user can access it. File uploads (recipe photos) are stored in Supabase Storage.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">Your API key</h3>
            <p>If you add a Groq or Gemini API key, it is stored in your account row in the database. It is used exclusively in your browser to call the AI provider directly. It is never sent to our servers or logged anywhere.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">Third-party services</h3>
            <ul className="flex flex-col gap-1 text-warm-secondary list-disc list-inside">
              <li><strong>Supabase</strong> — authentication, database, and file storage</li>
              <li><strong>Google OAuth</strong> — sign-in only; we receive your name, email, and avatar</li>
              <li><strong>Jina AI (r.jina.ai)</strong> — fetches recipe pages when you paste a URL; the URL is sent to their service</li>
              <li><strong>Groq / Google Gemini</strong> — AI extraction, called client-side using your own key</li>
              <li><strong>Vercel</strong> — hosting and edge functions</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">Data sharing</h3>
            <p>We do not sell, rent, or share your personal data with any third party for marketing or advertising purposes.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">Your rights</h3>
            <p>You can delete your API key at any time from Settings. To delete your account and all associated data, contact us via the project repository. We will action deletion requests promptly.</p>
          </section>

          <section>
            <h3 className="font-semibold text-warm-primary mb-1">Contact</h3>
            <p>Questions about your data: open an issue at the project repository or email the listed maintainer.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
