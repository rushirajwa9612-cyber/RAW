import { useEffect, useState } from 'react';
import {
  ImageIcon, Video, Wand2, MessageSquare, Layout, TrendingUp,
  Coins, ArrowRight, Sparkles, Flame, Lightbulb, X, Rocket,
} from 'lucide-react';
import { Link, useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { useCreation } from '@/context/CreationContext';
import { supabase } from '@/lib/supabase';
import type { Generation, Conversation } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState } from '@/components/ui/Feedback';

const quickActions = [
  { icon: ImageIcon, label: 'Generate Image', desc: 'Create from text', target: '/image', color: 'var(--accent)' },
  { icon: Video, label: 'Generate Video', desc: 'Text or image to video', target: '/video', color: 'var(--accent-2)' },
  { icon: Wand2, label: 'Edit Image', desc: 'Transform and enhance', target: '/edit', color: 'var(--success)' },
  { icon: MessageSquare, label: 'AI Chat', desc: 'Brainstorm and create', target: '/chat', color: 'var(--info)' },
];
const videoEnabled = import.meta.env.VITE_VIDEO_GENERATION_ENABLED === 'true';

const dailyChallenges = [
  { prompt: 'A cozy coffee shop on a rainy evening, warm lights, watercolor style', label: 'Cozy Vibes', stylePreset: 'digital-art', aspectRatio: '3:2' },
  { prompt: 'A majestic dragon perched on a mountain peak at sunrise, fantasy art', label: 'Mythical Creature', stylePreset: 'fantasy', aspectRatio: '16:9' },
  { prompt: 'Minimalist product photo of a luxury watch on a marble surface', label: 'Product Perfection', stylePreset: 'photorealistic', aspectRatio: '1:1' },
  { prompt: 'Retro 80s synthwave cityscape with neon grid and purple sky', label: 'Retro Futurism', stylePreset: 'cinematic', aspectRatio: '16:9' },
  { prompt: 'Portrait of an elderly fisherman with weathered skin, black and white', label: 'Character Study', stylePreset: 'photorealistic', aspectRatio: '1:1' },
  { prompt: 'An enchanted library with floating books and glowing dust particles', label: 'Magical Interior', stylePreset: 'fantasy', aspectRatio: '4:3' },
];

function getChallengeOfDay() {
  const dayIndex = Math.floor(Date.now() / 86400000) % dailyChallenges.length;
  return dailyChallenges[dayIndex];
}

export function Dashboard() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const { setPending } = useCreation();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const challenge = getChallengeOfDay();

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [genRes, convRes] = await Promise.all([
        supabase.from('generations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('conversations').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(4),
      ]);
      setGenerations((genRes.data as Generation[]) ?? []);
      setConversations((convRes.data as Conversation[]) ?? []);
      setLoading(false);
    }
    loadData();
  }, [user]);

  useEffect(() => {
    if (user && profile) {
      const dismissed = localStorage.getItem(`onboarding-dismissed-${user.id}`);
      if (!dismissed) {
        setShowOnboarding(true);
      }
    }
  }, [user, profile]);

  function dismissOnboarding() {
    setShowOnboarding(false);
    if (user) localStorage.setItem(`onboarding-dismissed-${user.id}`, 'true');
  }

  function startChallenge() {
    setPending({
      prompt: challenge.prompt,
      stylePreset: challenge.stylePreset,
      aspectRatio: challenge.aspectRatio,
      type: 'image',
    });
    navigate('/image');
  }

  const hasCreations = generations.length > 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card max-w-lg p-8 relative animate-[fadeIn_0.3s_ease]">
            <button onClick={dismissOnboarding} className="absolute top-4 right-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] mb-4">
              <Rocket className="h-7 w-7 text-[var(--accent)]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Welcome to RAW 2.0!</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Your AI creative studio is ready. Here's how to get started:</p>
            <div className="mt-5 space-y-3">
              {[
                { icon: ImageIcon, text: 'Generate images from text descriptions', color: 'var(--accent)' },
                ...(videoEnabled ? [{ icon: Video, text: 'Create 6-second videos from text or a source image', color: 'var(--accent-2)' }] : []),
                { icon: Wand2, text: 'Edit and enhance photos with AI tools', color: 'var(--success)' },
                { icon: Layout, text: 'Browse templates for quick-start inspiration', color: 'var(--info)' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${step.color}1a` }}>
                    <step.icon className="h-4 w-4" style={{ color: step.color }} />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">{step.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Button className="flex-1" size="lg" onClick={() => { dismissOnboarding(); navigate('/image'); }}>
                <Sparkles className="h-4 w-4" /> Create your first image
              </Button>
              <Button variant="ghost" size="lg" onClick={dismissOnboarding}>
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Welcome back, {profile?.display_name || 'Creator'}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">What would you like to create today?</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickActions.filter((action) => action.target !== '/video' || videoEnabled).map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.target)}
            className="card card-hover p-5 text-left group"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${action.color}1a` }}>
              <action.icon className="h-5 w-5" style={{ color: action.color }} />
            </div>
            <h3 className="mt-3 font-medium text-[var(--text-primary)]">{action.label}</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{action.desc}</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
              Start <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>

      {/* Daily Challenge */}
      <div className="card p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--accent-soft)] rounded-full blur-3xl opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] shrink-0">
              <Flame className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Daily Challenge</h2>
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)] font-medium">{challenge.label}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-lg line-clamp-2">{challenge.prompt}</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">New challenge every day. Try it and make it your own!</p>
            </div>
          </div>
          <Button onClick={startChallenge} className="shrink-0">
            <Sparkles className="h-4 w-4" /> Try Challenge
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Credits Balance</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{profile?.credits_balance ?? 0}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
              <Coins className="h-5 w-5 text-[var(--accent)]" />
            </div>
          </div>
          <Link to="/pricing" className="mt-3 flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
            Get more credits <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Plan</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1 capitalize">{profile?.plan ?? 'free'}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-2-soft)]">
              <TrendingUp className="h-5 w-5 text-[var(--accent-2)]" />
            </div>
          </div>
          <Link to="/pricing" className="mt-3 flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
            Upgrade plan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Total Creations</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{generations.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-3)]">
              <ImageIcon className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
          </div>
          <Link to="/library" className="mt-3 flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
            View library <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Tip of the day */}
      {!hasCreations && (
        <div className="card p-5 mb-8 flex items-start gap-3 border-l-4 border-l-[var(--accent)]">
          <Lightbulb className="h-5 w-5 text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">New here? Start with a template!</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Templates give you a ready-made prompt and settings. Just click "Use Template" and customize from there.</p>
            <button onClick={() => navigate('/templates')} className="mt-2 text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
              Browse templates <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading your creations..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent generations */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Recent Creations</h2>
              <Link to="/history" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
            </div>
            {generations.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-10 w-10" />}
                title="No creations yet"
                description="Start generating images or videos to see them here."
                action={<Button size="sm" onClick={() => navigate('/image')}>Generate Image</Button>}
              />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {generations.map((gen) => (
                  <div key={gen.id} className="aspect-square rounded-lg overflow-hidden bg-[var(--surface-2)] relative group">
                    {gen.thumbnail_url || gen.result_url ? (
                      <img src={gen.thumbnail_url || gen.result_url || ''} alt={gen.prompt} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-[var(--text-tertiary)]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-xs text-white truncate">{gen.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent conversations */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Recent Chats</h2>
              <Link to="/chat" className="text-xs text-[var(--accent)] hover:underline">Open chat</Link>
            </div>
            {conversations.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-10 w-10" />}
                title="No conversations yet"
                description="Start chatting with your AI assistant for creative ideas."
                action={<Button size="sm" onClick={() => navigate('/chat')}>Start Chatting</Button>}
              />
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => navigate('/chat')}
                    className="flex items-center gap-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 hover:border-[var(--border-strong)] transition-all text-left"
                  >
                    <MessageSquare className="h-5 w-5 text-[var(--text-tertiary)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{conv.title}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{new Date(conv.updated_at).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
