import { useState } from 'react';
import { ArrowLeft, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { Link, useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset-success';

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'forgot') {
      if (!email) {
        setError('Please enter your email address.');
        return;
      }
      setLoading(true);
      const result = await resetPassword(email);
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode('reset-success');
      return;
    }

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, displayName || undefined);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    if (mode === 'signup') {
      toast('Account created! Welcome to RAW 2.0.', 'success');
    }
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Visual side */}
      <div className="relative md:w-1/2 h-64 md:h-auto overflow-hidden">
        <img
          src="https://images.pexels.com/photos/9067815/pexels-photo-9067815.jpeg?auto=compress&cs=tinysrgb&h=900&w=600"
          alt="Creative showcase"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/70 to-[var(--bg-base)]/40" />
        <div className="relative z-10 flex h-full flex-col justify-end p-8 md:p-12">
          <Logo size={36} />
          <h1 className="mt-6 font-display text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
            {mode === 'signin' ? 'Welcome back to RAW 2.0' : mode === 'signup' ? 'Start creating with RAW 2.0' : 'Reset your password'}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm">
            {mode === 'signin'
              ? 'Sign in to continue your creative journey.'
              : mode === 'signup'
                ? 'Create your account and get 50 free credits to start.'
                : 'Enter your email and we will send you a reset link.'}
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Link to="/" className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-20">
          <div className="w-full max-w-sm">
            {mode === 'reset-success' ? (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success)]/15 mb-4">
                  <CheckCircle2 className="h-7 w-7 text-[var(--success)]" />
                </div>
                <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Check your email</h2>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  We sent a password reset link to <span className="font-medium text-[var(--text-primary)]">{email}</span>. Click the link in the email to set a new password.
                </p>
                <Button
                  variant="secondary"
                  className="w-full mt-6"
                  size="lg"
                  onClick={() => { setMode('signin'); setEmail(''); }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
                  {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {mode === 'signin' ? 'Enter your credentials to access your workspace.' : mode === 'signup' ? 'Fill in your details to get started.' : 'Enter your email to receive a reset link.'}
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  {mode === 'signup' && (
                    <div className="relative">
                      <User className="absolute left-3 top-[38px] h-4 w-4 text-[var(--text-tertiary)] z-10" />
                      <Input
                        label="Display Name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="pl-10"
                      />
                    </div>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-3 top-[38px] h-4 w-4 text-[var(--text-tertiary)] z-10" />
                    <Input
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10"
                      required
                    />
                  </div>
                  {mode !== 'forgot' && (
                    <div className="relative">
                      <Lock className="absolute left-3 top-[38px] h-4 w-4 text-[var(--text-tertiary)] z-10" />
                      <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10"
                        required
                      />
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)] animate-fade-in">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg" loading={loading}>
                    {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                  </Button>
                </form>

                <div className="mt-6 space-y-2 text-center text-sm text-[var(--text-secondary)]">
                  {mode === 'signin' && (
                    <button
                      onClick={() => { setMode('forgot'); setError(null); setPassword(''); }}
                      className="block w-full text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                    >
                      Forgot your password?
                    </button>
                  )}
                  <div>
                    {mode === 'signin' ? "Don't have an account? " : mode === 'signup' ? 'Already have an account? ' : 'Remember your password? '}
                    <button
                      onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
                      className="text-[var(--accent)] font-medium hover:underline"
                    >
                      {mode === 'signin' ? 'Sign up' : 'Sign in'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
