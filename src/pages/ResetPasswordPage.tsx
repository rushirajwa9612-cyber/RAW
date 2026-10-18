import { useState } from 'react';
import { Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useRouter, Link } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ResetPasswordPage() {
  const { updatePassword, clearPasswordRecovery } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    clearPasswordRecovery();
    toast('Password updated successfully.', 'success');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between p-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Logo size={36} className="justify-center" />
          </div>

          {success ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success)]/15 mb-4">
                <CheckCircle2 className="h-7 w-7 text-[var(--success)]" />
              </div>
              <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Password updated</h2>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <Button
                className="w-full mt-6"
                size="lg"
                onClick={() => navigate('/auth')}
              >
                Go to Sign In
              </Button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Create New Password</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Enter your new password below to secure your account.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-[38px] h-4 w-4 text-[var(--text-tertiary)] z-10" />
                  <Input
                    label="New Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-[38px] h-4 w-4 text-[var(--text-tertiary)] z-10" />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)] animate-fade-in">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Update Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
