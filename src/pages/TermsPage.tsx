import { Logo } from '@/components/Logo';
import { Link } from '@/context/RouterContext';

export function TermsPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-7xl px-6 py-4"><Link to="/"><Logo size={32} /></Link></div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Terms of Service</h1>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">Last updated: October 2026</p>
        <div className="mt-8 space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using RAW 2.0, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">2. Description of Service</h2>
            <p>RAW 2.0 provides AI-powered creative tools including image generation, video generation, image editing, and AI chat. We reserve the right to modify, suspend, or discontinue any feature at any time.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">3. User Accounts</h2>
            <p>You are responsible for maintaining the security of your account and password. You must be at least 13 years old to use this service.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">4. Acceptable Use</h2>
            <p>You agree not to use RAW 2.0 to generate content that is illegal, harmful, infringing, or violates the rights of others. This includes但不限于 content that is unlawful, defamatory, or infringes intellectual property rights.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">5. Credits and Billing</h2>
            <p>Generation costs credits. Free accounts receive a one-time allocation. Paid plans include monthly credits. Credits are non-refundable and do not roll over unless stated otherwise.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">6. Content Ownership</h2>
            <p>Content you create using RAW 2.0 is yours to use, subject to the terms of the underlying AI models. We claim no ownership over your generated content.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">7. Disclaimer</h2>
            <p>RAW 2.0 is provided "as is" without warranties of any kind. AI-generated results may vary and we do not guarantee specific outcomes.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">8. Contact</h2>
            <p>For questions about these terms, please <Link to="/contact" className="text-[var(--accent)] hover:underline">contact us</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
