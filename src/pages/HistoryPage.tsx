import { useEffect, useState } from 'react';
import { History, Search, RefreshCw, Check, X, Clock, Copy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCreation } from '@/context/CreationContext';
import { supabase } from '@/lib/supabase';
import type { Generation } from '@/types/database';
import { LoadingState, EmptyState } from '@/components/ui/Feedback';
import { useRouter } from '@/context/RouterContext';

const statusConfig = {
  completed: { icon: Check, color: 'var(--success)', label: 'Completed' },
  failed: { icon: X, color: 'var(--error)', label: 'Failed' },
  processing: { icon: Clock, color: 'var(--info)', label: 'Processing' },
  pending: { icon: Clock, color: 'var(--warning)', label: 'Pending' },
  cancelled: { icon: X, color: 'var(--text-tertiary)', label: 'Cancelled' },
};

export function HistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { setPending } = useCreation();
  const { navigate } = useRouter();
  const [items, setItems] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setItems((data as Generation[]) ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = items.filter((item) => {
    return !search || item.prompt.toLowerCase().includes(search.toLowerCase());
  });

  function copyPrompt(text: string) {
    navigator.clipboard.writeText(text);
    toast('Prompt copied.', 'success');
  }

  if (loading) return <LoadingState message="Loading history..." />;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <History className="h-6 w-6 text-[var(--accent)]" />
          Generation History
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Track all your generation attempts, including failures.</p>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search history..." className="input pl-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<History className="h-12 w-12" />}
          title="No history yet"
          description="Your generation history will appear here as you create."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const status = statusConfig[item.status] ?? statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div key={item.id} className="card p-4 flex items-center gap-4 group hover:border-[var(--border-strong)] transition-all">
                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-[var(--surface-2)] flex items-center justify-center">
                  {item.thumbnail_url || item.result_url ? (
                    <img src={item.thumbnail_url || item.result_url || ''} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs uppercase text-[var(--text-tertiary)]">{item.type[0]}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{item.prompt}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
                    <span className="capitalize">{item.type}</span>
                    <span>{item.aspect_ratio}</span>
                    {item.style_preset && <span className="capitalize">{item.style_preset}</span>}
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-xs" style={{ color: status.color }}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                  {item.credits_used > 0 && <span className="text-xs text-[var(--text-tertiary)]">{item.credits_used}cr</span>}
                  <button
                    onClick={() => copyPrompt(item.prompt)}
                    className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all opacity-0 group-hover:opacity-100"
                    title="Copy prompt"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setPending({
                        prompt: item.prompt,
                        aspectRatio: item.aspect_ratio,
                        stylePreset: item.style_preset || undefined,
                        type: item.type,
                      });
                      navigate(item.type === 'video' ? '/video' : item.type === 'edit' ? '/edit' : '/image');
                    }}
                    className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-all opacity-0 group-hover:opacity-100"
                    title="Reuse prompt"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
