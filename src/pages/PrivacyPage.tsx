import { Logo } from '@/components/Logo';
import { Link } from '@/context/RouterContext';

export function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-7xl px-6 py-4"><Link to="/"><Logo size={32} /></Link></div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">Last updated: October 2026</p>
        <div className="mt-8 space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">1. Information We Collect</h2>
            <p>We collect your email address, display name, and content you create (prompts, generations, conversations). We do not collect sensitive personal data beyond what is necessary to operate the service.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">2. How We Use Your Data</h2>
            <p>Your data is used to provide the RAW 2.0 service: authentication, storing your creations, chat history, and improving the user experience. We do not sell your data to third parties.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">3. Data Security</h2>
            <p>We use row-level security on all user data. Your generations, conversations, and projects are private and accessible only by you. We use encryption in transit and at rest.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">4. AI Provider Sharing</h2>
            <p>When you generate content, your prompts are sent to configured AI providers. We do not store your prompts on third-party servers beyond what is necessary for the generation request.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">5. Your Rights</h2>
            <p>You can delete your account and all associated data at any time. You can export your generation history. Contact us for data deletion requests.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">6. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use tracking cookies for advertising.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">7. Contact</h2>
            <p>For privacy questions, please <Link to="/contact" className="text-[var(--accent)] hover:underline">contact us</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
