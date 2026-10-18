import { Check, Coins, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/Logo';
import { Link } from '@/context/RouterContext';

const plans = [
  { name: 'Free', price: 0, credits: '50 credits', features: ['Basic models', 'Standard resolution', '5 generations/day', 'Community support'] },
  { name: 'Starter', price: 9, credits: '500 credits/mo', features: ['Standard models', 'HD resolution', '50 generations/day', 'Email support'] },
  { name: 'Pro', price: 29, credits: '2,000 credits/mo', features: ['Premium models', '4K resolution', 'Unlimited generations', 'Priority support'], featured: true },
  { name: 'Ultimate', price: 99, credits: '10,000 credits/mo', features: ['All models', 'Max resolution', 'Unlimited everything', 'Dedicated support', 'API access'] },
];

export function PricingPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/"><Logo size={32} /></Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Home</Link>
            <Button size="sm" onClick={() => navigate(user ? '/dashboard' : '/auth')}>{user ? 'Dashboard' : 'Sign In'}</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-[var(--text-primary)]">Choose your plan</h1>
          <p className="mt-3 text-[var(--text-secondary)] max-w-xl mx-auto">Start free, upgrade when you need more. All plans include access to the full creative suite.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card p-6 relative ${plan.featured ? 'border-[var(--accent)]' : ''}`}
              style={plan.featured ? { boxShadow: '0 0 30px var(--accent-soft)' } : {}}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--bg-base)]">
                  Most Popular
                </span>
              )}
              <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--text-primary)]">${plan.price}</span>
                <span className="text-sm text-[var(--text-tertiary)]">/mo</span>
              </div>
              <p className="mt-1 text-sm text-[var(--accent)] flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{plan.credits}</p>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="h-4 w-4 text-[var(--success)] shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.featured ? 'primary' : 'secondary'}
                className="w-full mt-6"
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
              >
                {plan.price === 0 ? 'Get Started' : 'Choose Plan'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-16 card p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Frequently Asked Questions</h2>
          <div className="mt-6 max-w-2xl mx-auto space-y-4 text-left">
            {[
              { q: 'How do credits work?', a: 'Each generation costs credits based on the model and settings. Simpler generations cost fewer credits, while high-resolution or video generations cost more.' },
              { q: 'Do credits roll over?', a: 'Unused credits from your monthly allocation do not roll over. Free credits are one-time, while paid plans refresh monthly.' },
              { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time. You will keep access until the end of your billing period.' },
              { q: 'What payment methods are supported?', a: 'We support major credit cards and debit cards through our payment provider. Additional methods may be available based on your region.' },
            ].map((faq, i) => (
              <div key={i} className="border-b border-[var(--border)] pb-4">
                <p className="font-medium text-[var(--text-primary)]">{faq.q}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
