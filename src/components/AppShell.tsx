import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  ImageIcon,
  Video,
  Wand2,
  Layout,
  Compass,
  FolderOpen,
  History,
  Settings,
  Menu,
  X,
  LogOut,
  Palette,
  Coins,
  Sparkles,
  Camera,
} from 'lucide-react';
import { Link, useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme, THEMES, type ThemeName } from '@/context/ThemeContext';
import { Logo } from '@/components/Logo';
import { Dialog } from '@/components/ui/Dialog';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/chat', label: 'AI Chat', icon: MessageSquare },
  { path: '/selfie', label: 'Selfie Studio', icon: Camera },
  { path: '/image', label: 'Image Generator', icon: ImageIcon },
  { path: '/edit', label: 'Image Editor', icon: Wand2 },
  { path: '/video', label: 'Video Generator', icon: Video },
  { path: '/templates', label: 'Templates', icon: Layout },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/projects', label: 'Projects', icon: FolderOpen },
  { path: '/library', label: 'Library', icon: ImageIcon },
  { path: '/history', label: 'History', icon: History },
];

const bottomItems = [
  { path: '/settings', label: 'Settings', icon: Settings },
];
const videoEnabled = import.meta.env.VITE_VIDEO_GENERATION_ENABLED === 'true';

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const routePath = path.split('?')[0];
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const credits = profile?.credits_balance ?? 0;
  const plan = profile?.plan ?? 'free';

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5 shrink-0">
        <Link to="/dashboard">
          <Logo size={32} />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.filter((item) => item.path !== '/video' || videoEnabled).map((item) => {
          const active = routePath === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-all ${
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-3 space-y-1">
        <button
          onClick={() => setThemeOpen(true)}
          className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-all w-full"
        >
          <Palette className="h-5 w-5 shrink-0" />
          <span>Theme</span>
          <span className="ml-auto text-xs capitalize text-[var(--text-tertiary)]">{theme}</span>
        </button>

        {bottomItems.map((item) => {
          const active = routePath === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-all ${
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--accent)] text-xs font-semibold shrink-0">
            {(user?.email ?? '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
              {profile?.display_name || user?.email}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] capitalize">{plan} plan</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)]">
        {Sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[150]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-[var(--bg-elevated)] animate-slide-in-right">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
            {Sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-[var(--text-secondary)]">
            <Menu className="h-6 w-6" />
          </button>
          <Logo size={28} />
          <Link to="/settings" className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
            <Coins className="h-4 w-4" />
            {credits}
          </Link>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-3 shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="flex items-center gap-2 rounded-full bg-[var(--surface-1)] border border-[var(--border)] px-3 py-1.5 text-xs">
              <Coins className="h-4 w-4 text-[var(--accent)]" />
              <span className="font-medium text-[var(--text-primary)]">{credits} credits</span>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="capitalize text-[var(--text-secondary)]">{plan}</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Dashboard
            </Link>
            <Link to="/help" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Help
            </Link>
            <Link to="/" className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] hover:brightness-110 transition-all">
              <Sparkles className="h-4 w-4" />
              Go to Studio
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Theme picker dialog */}
      <Dialog open={themeOpen} onClose={() => setThemeOpen(false)} title="Choose Theme">
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                setTheme(t.name as ThemeName);
                setThemeOpen(false);
              }}
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
      </Dialog>
    </div>
  );
}
