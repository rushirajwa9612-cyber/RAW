import { useState } from 'react';
import {
  Sparkles, ImageIcon, Video, Wand2, Layout, MessageSquare,
  ArrowRight, ChevronDown, Zap, Shield, Globe, Coins, Check,
} from 'lucide-react';
import { Link, useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';

const videoEnabled = import.meta.env.VITE_VIDEO_GENERATION_ENABLED === 'true';

const showcaseImages = [
  'https://images.pexels.com/photos/9067815/pexels-photo-9067815.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/10109585/pexels-photo-10109585.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/18545016/pexels-photo-18545016.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/30784971/pexels-photo-30784971.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/15649980/pexels-photo-15649980.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/17917581/pexels-photo-17917581.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

const features = [
  { icon: ImageIcon, title: 'Image Generation', desc: 'Create stunning visuals from text prompts with multiple models, aspect ratios, and style presets.' },
  ...(videoEnabled ? [{ icon: Video, title: 'Video Generation', desc: 'Create six-second landscape videos from text or a source image.' }] : []),
  { icon: Wand2, title: 'Image Editing', desc: 'Edit, enhance, and transform images with AI-powered tools and instruction-based editing.' },
  { icon: MessageSquare, title: 'AI Creative Chat', desc: 'Brainstorm ideas, refine prompts, and get creative guidance from your AI assistant.' },
];

const workflows = [
  { title: 'Cinematic Portraits', desc: 'Dramatic lighting, film grain, professional portrait photography', tag: 'Image' },
  { title: 'Fantasy Landscapes', desc: 'Ethereal worlds, mystical mountains, dreamlike atmospheres', tag: 'Image' },
  { title: 'Product Showcase', desc: 'Studio-quality product shots with controlled lighting', tag: 'Image' },
  ...(videoEnabled ? [{ title: 'Motion from Still', desc: 'Animate a source image into a six-second landscape video.', tag: 'Video' }] : []),
  { title: 'Style Transfer', desc: 'Reimagine your photos in any artistic style', tag: 'Edit' },
  { title: 'Concept Art', desc: 'Character design, environment sketches, and world-building', tag: 'Image' },
];

const plans = [
  { name: 'Free', price: '0', credits: '50 credits', features: ['Basic models', 'Standard resolution', '5 generations/day', 'Community support'], cta: 'Get Started' },
  { name: 'Starter', price: '9', credits: '500 credits/mo', features: ['Standard models', 'HD resolution', '50 generations/day', 'Email support'], cta: 'Choose Starter' },
  { name: 'Pro', price: '29', credits: '2,000 credits/mo', features: ['Premium models', '4K resolution', 'Unlimited generations', 'Priority support'], cta: 'Choose Pro', featured: true },
  { name: 'Ultimate', price: '99', credits: '10,000 credits/mo', features: ['All models', 'Max resolution', 'Unlimited everything', 'Dedicated support', 'API access'], cta: 'Choose Ultimate' },
];

const faqs = [
  { q: 'What is RAW 2.0?', a: 'RAW 2.0 is an AI creative platform for image creation, photo editing, and AI chat. Video creation is shown only when the site administrator has enabled its provider.' },
  { q: 'Do I need an account to use it?', a: 'You can explore the landing page and pricing without an account. To generate content, save your work, or use AI chat, you will need to create a free account.' },
  { q: 'How do credits work?', a: 'Each generation costs credits based on the model and settings used. Free accounts get 50 credits to start. Paid plans include monthly credit allocations.' },
  { q: 'Can I use the images commercially?', a: 'Yes, content you create with RAW 2.0 is yours to use. We recommend reviewing the specific AI model terms for any additional requirements.' },
  { q: 'What AI models are supported?', a: 'RAW 2.0 connects to configured AI providers. Video generation appears only when the administrator has configured and enabled the video provider.' },
  { q: 'Is my data private?', a: 'Your generations, conversations, and projects are private to your account. We use row-level security to ensure only you can access your data.' },
];

export function LandingPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [prompt, setPrompt] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  function handleComposerSubmit(target: string) {
    if (user) {
      navigate(target);
    } else {
      navigate('/auth');
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-base)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo size={32} />
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Features</Link>
            <Link to="/templates" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Templates</Link>
            <Link to="/explore" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Explore</Link>
            <Link to="/pricing" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
            <Link to="/help" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Help</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to={user ? '/dashboard' : '/auth'} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              {user ? 'Dashboard' : 'Sign In'}
            </Link>
            <Button size="sm" onClick={() => navigate(user ? '/dashboard' : '/auth')}>
              {user ? 'Go to Studio' : 'Get Started'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-1)] px-4 py-1.5 text-xs text-[var(--text-secondary)] animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            AI Creative Superplatform
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
            Create Without Limits
          </h1>
          <p className="mt-5 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
            Generate stunning images, edit photos, and brainstorm with AI — all in one creative platform.
          </p>

          {/* Prompt composer */}
          <div className="mt-8 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
            <div className="card p-2 flex items-center gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComposerSubmit('/image')}
                placeholder="Describe what you want to create..."
                className="flex-1 bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              />
              <Button size="md" onClick={() => handleComposerSubmit('/image')}>
                Create
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {[
                { label: 'Image', icon: ImageIcon, target: '/image' },
                ...(videoEnabled ? [{ label: 'Video', icon: Video, target: '/video' }] : []),
                { label: 'Edit', icon: Wand2, target: '/edit' },
                { label: 'Templates', icon: Layout, target: '/templates' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleComposerSubmit(item.target)}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Showcase gallery */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {showcaseImages.map((url, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-[var(--radius-lg)] group ${i === 0 || i === 5 ? 'row-span-2' : ''}`}
                style={{ aspectRatio: i === 0 || i === 5 ? '1/2' : '1/1' }}
              >
                <img
                  src={url}
                  alt={`Showcase ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--text-primary)]">Everything you need to create</h2>
            <p className="mt-3 text-[var(--text-secondary)] max-w-xl mx-auto">Powerful AI tools designed for creators, by creators.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div key={i} className="card card-hover p-6 animate-fade-up" style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                  <f.icon className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-[var(--text-primary)]">{f.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflows */}
      <section className="px-6 py-20 bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--text-primary)]">Popular workflows</h2>
            <p className="mt-3 text-[var(--text-secondary)]">Start creating with these proven creative approaches.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workflows.map((w, i) => (
              <div key={i} className="card card-hover p-6 cursor-pointer animate-fade-up" style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }} onClick={() => handleComposerSubmit('/templates')}>
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">{w.title}</h3>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs text-[var(--accent)]">{w.tag}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{w.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-sm text-[var(--accent)]">
                  Try it <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why RAW 2.0 */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Fast & Reliable', desc: 'Optimized workflows that get you from idea to result quickly.' },
              { icon: Shield, title: 'Private & Secure', desc: 'Your data is protected with row-level security and encryption.' },
              { icon: Globe, title: 'Multi-Provider', desc: 'Connect to multiple AI models through one unified interface.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
                  <item.icon className="h-7 w-7 text-[var(--accent)]" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--text-primary)]">Simple, transparent pricing</h2>
            <p className="mt-3 text-[var(--text-secondary)]">Start free. Upgrade when you need more.</p>
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
                <p className="mt-1 text-sm text-[var(--accent)]">{plan.credits}</p>
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
                  onClick={() => navigate(user ? '/pricing' : '/auth')}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--text-primary)]">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-[var(--text-primary)]">{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 text-[var(--text-tertiary)] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-[var(--text-secondary)] animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="card p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 50% 50%, var(--accent), transparent 70%)' }} />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-[var(--text-primary)]">Ready to create?</h2>
              <p className="mt-3 text-[var(--text-secondary)]">Join RAW 2.0 and start creating with AI today.</p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button size="lg" onClick={() => navigate(user ? '/dashboard' : '/auth')}>
                  {user ? 'Go to Dashboard' : 'Get Started Free'}
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button size="lg" variant="secondary" onClick={() => navigate('/pricing')}>
                  <Coins className="h-5 w-5" />
                  View Pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-12 bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="max-w-xs">
              <Logo size={28} />
              <p className="mt-4 text-sm text-[var(--text-tertiary)]">The AI creative superplatform for images, video, and beyond.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Product</h4>
                <div className="space-y-2">
                  <Link to="/pricing" className="block text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
                  <Link to="/templates" className="block text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Templates</Link>
                  <Link to="/explore" className="block text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Explore</Link>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Support</h4>
                <div className="space-y-2">
                  <Link to="/help" className="block text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Help Center</Link>
                  <Link to="/contact" className="block text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Contact</Link>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Legal</h4>
                <div className="space-y-2">
                  <Link to="/terms" className="block text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link>
                  <Link to="/privacy" className="block text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-[var(--border)] pt-6 flex items-center justify-between">
            <p className="text-xs text-[var(--text-tertiary)]">&copy; 2026 RAW 2.0. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
