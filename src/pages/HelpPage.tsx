import { HelpCircle, MessageSquare, ImageIcon, Video, Wand2, Coins, Settings, Search } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Link, useRouter } from '@/context/RouterContext';
import { useState } from 'react';

const helpTopics = [
  { icon: ImageIcon, title: 'Image Generation', desc: 'How to create images from text prompts', path: '/image' },
  { icon: Video, title: 'Video Generation', desc: 'Creating videos from text or images', path: '/video' },
  { icon: Wand2, title: 'Image Editing', desc: 'Editing and enhancing your images', path: '/edit' },
  { icon: MessageSquare, title: 'AI Chat', desc: 'Using the AI creative assistant', path: '/chat' },
  { icon: Coins, title: 'Credits & Billing', desc: 'Understanding credits and plans', path: '/pricing' },
  { icon: Settings, title: 'Account Settings', desc: 'Managing your profile and preferences', path: '/settings' },
];

const faqs = [
  { q: 'How do I create my first image?', a: 'Go to Image Generator, type a description of what you want in the prompt field, choose your settings (aspect ratio, style), and click Generate. Your image will appear in the results area.' },
  { q: 'What are credits and how do I get more?', a: 'Credits are used for each generation. Free accounts get 50 credits. You can get more by upgrading to a paid plan on the Pricing page.' },
  { q: 'Can I edit images I have already generated?', a: 'Yes! Go to the Image Editor, upload or use any image, choose an edit tool, and apply your changes with natural language instructions.' },
  { q: 'How do I create a video?', a: 'Video generation is available only when the Replicate provider has been configured by the site administrator. When enabled, the Video Generator supports six-second landscape clips from text or a source image.' },
  { q: 'Where are my creations saved?', a: 'All completed generations are saved in your Library and History. They are private to your account and can be searched, filtered, and downloaded.' },
  { q: 'How do I change my theme?', a: 'Go to Settings and scroll to the Appearance section. You can choose from 9 visually distinct themes. Your preference is saved automatically.' },
  { q: 'What if a generation fails?', a: 'Failed generations show an error message with details. Common causes include insufficient credits or missing AI provider configuration. Failed jobs do not consume credits.' },
];

export function HelpPage() {
  const { navigate } = useRouter();
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredFaqs = faqs.filter((f) => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/"><Logo size={32} /></Link>
          <Link to="/contact" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Contact Support</Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)] flex items-center justify-center gap-2">
            <HelpCircle className="h-7 w-7 text-[var(--accent)]" />
            Help Center
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Find answers and learn how to use RAW 2.0.</p>
        </div>

        <div className="relative mb-8 max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search help topics..." className="input pl-10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {helpTopics.map((topic) => (
            <button
              key={topic.title}
              onClick={() => navigate(topic.path)}
              className="card card-hover p-5 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                <topic.icon className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <h3 className="mt-3 font-medium text-[var(--text-primary)]">{topic.title}</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{topic.desc}</p>
            </button>
          ))}
        </div>

        <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {filteredFaqs.map((faq, i) => (
            <div key={i} className="card overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                <span className="font-medium text-[var(--text-primary)]">{faq.q}</span>
                <span className="text-[var(--text-tertiary)] text-xl">{openFaq === i ? '-' : '+'}</span>
              </button>
              {openFaq === i && <div className="px-5 pb-4 text-sm text-[var(--text-secondary)] animate-fade-in">{faq.a}</div>}
            </div>
          ))}
        </div>

        <div className="mt-12 card p-8 text-center">
          <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">Still need help?</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Our support team is here to help.</p>
          <Link to="/contact" className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
