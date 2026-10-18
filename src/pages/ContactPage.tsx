import { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Link } from '@/context/RouterContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function ContactPage() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) {
      toast('Please fill in all required fields.', 'warning');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert({ name, email, subject, message });

      if (error) throw error;

      setSent(true);
      toast('Message sent! We will get back to you soon.', 'success');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      toast('Could not send message right now. Please email us directly at support@RAW 2.0.com.', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-7xl px-6 py-4"><Link to="/"><Logo size={32} /></Link></div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)] flex items-center justify-center gap-2">
            <Mail className="h-7 w-7 text-[var(--accent)]" />
            Contact Us
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Questions, feedback, or need help? Send us a message.</p>
        </div>

        {sent ? (
          <div className="card p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success)]/15 mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-[var(--success)]" />
            </div>
            <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Message sent!</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Thanks for reaching out. We'll get back to you at the email you provided.</p>
            <Button variant="ghost" className="mt-5" onClick={() => setSent(false)}>Send another message</Button>
          </div>
        ) : (
          <div className="card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this about?" />
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us how we can help..." rows={5} className="input resize-none" required />
              </div>
              <Button type="submit" className="w-full" size="lg" loading={sending}>
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
              <Mail className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Email</p>
              <p className="text-xs text-[var(--text-tertiary)]">support@RAW 2.0.com</p>
            </div>
          </div>
          <Link to="/help" className="card card-hover p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-2-soft)]">
              <MessageSquare className="h-5 w-5 text-[var(--accent-2)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Help Center</p>
              <p className="text-xs text-[var(--text-tertiary)]">Browse articles and FAQs</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
