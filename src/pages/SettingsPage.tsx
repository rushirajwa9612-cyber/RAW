import { useState } from 'react';
import { Settings, User, Coins, Palette, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTheme, THEMES, type ThemeName } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, bio })
      .eq('id', user.id);
    if (error) {
      toast('Failed to save profile.', 'error');
    } else {
      await refreshProfile();
      toast('Profile updated.', 'success');
    }
    setSaving(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Settings className="h-6 w-6 text-[var(--accent)]" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
            <User className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Profile</h2>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--accent)] text-2xl font-bold">
            {(user?.email ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{user?.email}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Member since {new Date(profile?.created_at ?? Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Bio</label>
            <textarea
              value={bio ?? ''}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              className="input resize-none"
            />
          </div>
          <Button onClick={saveProfile} loading={saving} disabled={!displayName.trim()}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Account info */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-2-soft)]">
            <Coins className="h-5 w-5 text-[var(--accent-2)]" />
          </div>
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Account</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
            <span className="text-sm text-[var(--text-secondary)]">Plan</span>
            <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{profile?.plan ?? 'free'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
            <span className="text-sm text-[var(--text-secondary)]">Credits Balance</span>
            <span className="text-sm font-medium text-[var(--accent)]">{profile?.credits_balance ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-3)]">
            <Palette className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Appearance</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Choose your preferred theme. Changes are saved automatically.</p>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.name}
              onClick={() => setTheme(t.name as ThemeName)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                theme === t.name
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex gap-1">
                {t.swatch.map((c, i) => (
                  <div key={i} className="h-6 w-6 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <span className="text-xs text-[var(--text-secondary)]">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
