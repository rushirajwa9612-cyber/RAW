import { useEffect, useState } from 'react';
import { FolderOpen, ImageIcon, Video, Trash2, Download, Search, Heart, Wand2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCreation } from '@/context/CreationContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import type { Generation } from '@/types/database';
import { LoadingState, EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';

export function LibraryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { setPending } = useCreation();
  const { navigate } = useRouter();
  const [items, setItems] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'edit' | 'favorites'>('all');

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      setItems((data as Generation[]) ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  async function deleteItem(id: string) {
    const { error } = await supabase.from('generations').delete().eq('id', id);
    if (error) {
      toast('Failed to delete.', 'error');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast('Item deleted.', 'success');
  }

  async function toggleFavorite(id: string, current: boolean) {
    const { error } = await supabase
      .from('generations')
      .update({ is_favorite: !current })
      .eq('id', id);
    if (error) {
      toast('Failed to update favorite.', 'error');
      return;
    }
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, is_favorite: !current } : item));
    toast(!current ? 'Added to favorites.' : 'Removed from favorites.', 'success');
  }

  function reusePrompt(item: Generation) {
    setPending({
      prompt: item.prompt,
      aspectRatio: item.aspect_ratio,
      stylePreset: item.style_preset || undefined,
      type: item.type,
    });
    navigate(item.type === 'video' ? '/video' : '/image');
  }

  const filtered = items.filter((item) => {
    const matchesSearch = !search || item.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'favorites' ? item.is_favorite : item.type === filter);
    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingState message="Loading your library..." />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-[var(--accent)]" />
          Library
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">All your completed creations in one place. Favorite the ones you love, reuse prompts, or start fresh.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by prompt..." className="input pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'image', 'video', 'edit', 'favorites'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm capitalize whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === f ? 'bg-[var(--accent)] text-[var(--bg-base)] font-medium' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              {f === 'favorites' && <Heart className="h-3 w-3" />}
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title={filter === 'favorites' ? 'No favorites yet' : 'Your library is empty'}
          description={filter === 'favorites' ? 'Tap the heart icon on any creation to save it here.' : 'Completed generations will appear here. Start creating to build your collection.'}
          action={<Button size="sm" onClick={() => navigate('/image')}>Generate Image</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="card overflow-hidden group">
              <div className="aspect-square overflow-hidden bg-[var(--surface-2)] relative">
                {item.type === 'video' ? (
                  <video src={item.result_url ?? ''} className="h-full w-full object-cover" muted />
                ) : (
                  <img src={item.thumbnail_url || item.result_url || ''} alt={item.prompt} className="h-full w-full object-cover" loading="lazy" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => window.open(item.result_url ?? '', '_blank')} className="rounded-lg bg-[var(--surface-3)] p-2 text-white hover:bg-[var(--accent)] transition-colors" title="Download">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => reusePrompt(item)} className="rounded-lg bg-[var(--surface-3)] p-2 text-white hover:bg-[var(--accent)] transition-colors" title="Reuse prompt">
                    <Wand2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="rounded-lg bg-[var(--surface-3)] p-2 text-white hover:bg-[var(--error)] transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="absolute top-2 left-2">
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white capitalize flex items-center gap-1">
                    {item.type === 'video' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                    {item.type}
                  </span>
                </div>
                <button
                  onClick={() => toggleFavorite(item.id, item.is_favorite)}
                  className={`absolute top-2 right-2 rounded-full p-1.5 transition-all ${item.is_favorite ? 'bg-[var(--error)]/20 text-[var(--error)]' : 'bg-black/40 text-white/70 hover:text-[var(--error)]'}`}
                  title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`h-4 w-4 ${item.is_favorite ? 'fill-current' : ''}`} />
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{item.prompt}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">{new Date(item.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
