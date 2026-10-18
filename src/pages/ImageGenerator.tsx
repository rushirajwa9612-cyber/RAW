import { useEffect, useState } from 'react';
import {
  ImageIcon, Sparkles, Download, Copy, RefreshCw,
  AlertCircle, Check, Heart,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCreation } from '@/context/CreationContext';
import { supabase } from '@/lib/supabase';
import { invokeAuthedFunction } from '@/lib/edgeFunctions';
import type { Generation } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/Feedback';

const aspectRatios = [
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Widescreen' },
  { value: '9:16', label: '9:16 Portrait' },
  { value: '4:3', label: '4:3 Classic' },
  { value: '3:2', label: '3:2 Photo' },
  { value: '21:9', label: '21:9 Cinematic' },
];

const stylePresets = [
  { value: '', label: 'No preset' },
  { value: 'photorealistic', label: 'Photorealistic' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'anime', label: 'Anime' },
  { value: 'digital-art', label: 'Digital Art' },
  { value: 'oil-painting', label: 'Oil Painting' },
  { value: '3d-render', label: '3D Render' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'minimalist', label: 'Minimalist' },
];

const models = [
  { value: 'default', label: 'Default Model' },
];

const examplePrompts = [
  'A majestic lion standing on a cliff at sunset, cinematic lighting, ultra detailed',
  'Cyberpunk city street at night, neon reflections in puddles, moody atmosphere',
  'Ethereal forest with glowing mushrooms and fireflies, fantasy concept art',
  'Portrait of an astronaut helmet reflecting a colorful nebula, dramatic lighting',
];

const promptEnhancers = [
  { label: 'Ultra detailed', value: 'ultra detailed, sharp focus, high resolution' },
  { label: 'Cinematic light', value: 'cinematic lighting, dramatic shadows, volumetric light' },
  { label: '8K quality', value: '8K, masterpiece, professional photography, award-winning' },
  { label: 'Vivid colors', value: 'vivid colors, vibrant, rich color palette' },
  { label: 'Soft bokeh', value: 'shallow depth of field, beautiful bokeh, blurred background' },
  { label: 'Epic scale', value: 'epic scale, sweeping vista, grand composition' },
  { label: 'Film grain', value: 'film grain, analog texture, vintage aesthetic' },
  { label: 'Studio quality', value: 'studio quality, professional color grading, commercial photography' },
];

const CREDITS_PER_IMAGE = 2;

export function ImageGenerator() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { pending, clearPending } = useCreation();
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [stylePreset, setStylePreset] = useState('');
  const [model, setModel] = useState('default');
  const [numImages, setNumImages] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Generation[]>([]);
  const [recentGens, setRecentGens] = useState<Generation[]>([]);

  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'image')
        .order('created_at', { ascending: false })
        .limit(8);
      setRecentGens((data as Generation[]) ?? []);
    }
    loadHistory();
  }, [user]);

  useEffect(() => {
    if (pending) {
      setPrompt(pending.prompt || '');
      if (pending.negativePrompt) setNegativePrompt(pending.negativePrompt);
      if (pending.aspectRatio) setAspectRatio(pending.aspectRatio);
      if (pending.stylePreset !== undefined) setStylePreset(pending.stylePreset);
      if (pending.model) setModel(pending.model);
      clearPending();
    }
  }, [pending, clearPending]);

  async function generate() {
    if (!prompt.trim()) {
      toast('Please enter a prompt.', 'warning');
      return;
    }
    if (!user) return;
    setGenerating(true);
    try {
      const data = await invokeAuthedFunction<{ generationId: string; images: string[]; creditsBalance: number }>('generate-image', {
          prompt: prompt.trim(),
          negativePrompt: negativePrompt || undefined,
          aspectRatio,
          stylePreset: stylePreset || undefined,
          numImages,
          model,
      });
      const imageUrls = data.images ?? [];

      if (imageUrls.length === 0) {
        throw new Error('No images returned by provider.');
      }

      const completedGen: Generation = {
        id: data.generationId,
        user_id: user.id,
        type: 'image',
        prompt: prompt.trim(),
        negative_prompt: negativePrompt || null,
        model,
        aspect_ratio: aspectRatio,
        resolution: null,
        style_preset: stylePreset || null,
        num_images: imageUrls.length,
        status: 'completed',
        result_url: imageUrls[0],
        result_urls: imageUrls,
        thumbnail_url: imageUrls[0],
        error_message: null,
        provider_job_id: null,
        metadata: {},
        credits_used: CREDITS_PER_IMAGE * numImages,
        is_favorite: false,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };
      setResults((prev) => [completedGen, ...prev]);
      await refreshProfile();

      toast('Image generated successfully!', 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Generation failed.';
      toast(`Generation failed: ${errorMsg}`, 'error');
    } finally {
      setGenerating(false);
    }
  }

  function copyPrompt(text: string) {
    navigator.clipboard.writeText(text);
    toast('Prompt copied.', 'success');
  }

  function downloadImage(url: string) {
    window.open(url, '_blank');
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
    setResults((prev) => prev.map((g) => g.id === id ? { ...g, is_favorite: !current } : g));
    toast(!current ? 'Added to favorites.' : 'Removed from favorites.', 'success');
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-[var(--accent)]" />
          Image Generator
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Create stunning images from text descriptions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* Controls */}
        <div className="card p-5 space-y-4 lg:sticky lg:top-0 lg:self-start">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              rows={4}
              className="input resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-tertiary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
              >
                Example {i + 1}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Enhance prompt <span className="text-[var(--text-tertiary)]">(click to add)</span></label>
            <div className="flex flex-wrap gap-2">
              {promptEnhancers.map((enh) => {
                const isActive = prompt.toLowerCase().includes(enh.value.split(',')[0].toLowerCase());
                return (
                  <button
                    key={enh.label}
                    onClick={() => {
                      if (isActive) {
                        const firstKey = enh.value.split(',')[0];
                        const regex = new RegExp(`\\s*,?\\s*${firstKey}[^,]*(,[^,]*)*`, 'i');
                        setPrompt((prev) => prev.replace(regex, '').replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim());
                      } else {
                        setPrompt((prev) => {
                          const base = prev.trim().replace(/[.,]\s*$/, '');
                          return base ? `${base}, ${enh.value}` : enh.value;
                        });
                      }
                    }}
                    className={`rounded-full border px-3 py-1 text-xs transition-all ${isActive ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'}`}
                  >
                    {enh.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Negative Prompt <span className="text-[var(--text-tertiary)]">(optional)</span></label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What to avoid in the image..."
              rows={2}
              className="input resize-none"
            />
          </div>

          <Select label="Model" value={model} onChange={(e) => setModel(e.target.value)} options={models} />
          <Select label="Aspect Ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} options={aspectRatios} />
          <Select label="Style Preset" value={stylePreset} onChange={(e) => setStylePreset(e.target.value)} options={stylePresets} />

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Number of Images</label>
            <div className="flex gap-2">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumImages(n)}
                  className={`flex-1 rounded-lg border py-2 text-sm transition-all ${
                    numImages === n
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] pt-2 border-t border-[var(--border)]">
            <span>Cost: {CREDITS_PER_IMAGE * numImages} credits</span>
            <span>Balance: {profile?.credits_balance ?? 0}</span>
          </div>

          <Button className="w-full" size="lg" onClick={generate} loading={generating} disabled={!prompt.trim()}>
            <Sparkles className="h-5 w-5" />
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {results.length === 0 && recentGens.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-12 w-12" />}
              title="No images yet"
              description="Enter a prompt and click Generate to create your first image."
            />
          ) : (
            <>
              {results.map((gen) => (
                <div key={gen.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{gen.prompt}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => copyPrompt(gen.prompt)} className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all" title="Copy prompt">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setPrompt(gen.prompt); setAspectRatio(gen.aspect_ratio); if (gen.style_preset) setStylePreset(gen.style_preset); }} className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all" title="Reuse settings">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {gen.status === 'pending' || gen.status === 'processing' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: gen.num_images }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-lg shimmer flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 text-[var(--text-tertiary)] animate-spin-slow" />
                        </div>
                      ))}
                    </div>
                  ) : gen.status === 'failed' ? (
                    <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-[var(--error)] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-[var(--error)] font-medium">Generation failed</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{gen.error_message}</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`grid gap-3 ${gen.result_urls && gen.result_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {(gen.result_urls ?? [gen.result_url]).filter(Boolean).map((url, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-lg bg-[var(--surface-2)]">
                          <img src={url!} alt={`${gen.prompt} ${i + 1}`} className="w-full h-auto" loading="lazy" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="sm" variant="secondary" onClick={() => downloadImage(url!)}>
                              <Download className="h-4 w-4" /> Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {gen.status === 'completed' && (
                    <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1"><Check className="h-3 w-3 text-[var(--success)]" /> Completed</span>
                      <span>{gen.aspect_ratio}</span>
                      {gen.style_preset && <span className="capitalize">{gen.style_preset}</span>}
                      <span>{gen.credits_used} credits</span>
                      <button
                        onClick={() => toggleFavorite(gen.id, gen.is_favorite)}
                        className={`ml-auto flex items-center gap-1 transition-colors ${gen.is_favorite ? 'text-[var(--error)]' : 'hover:text-[var(--error)]'}`}
                        title={gen.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`h-3.5 w-3.5 ${gen.is_favorite ? 'fill-current' : ''}`} />
                        {gen.is_favorite ? 'Favorited' : 'Favorite'}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {recentGens.length > 0 && results.length === 0 && (
                <div>
                  <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-3">Recent Generations</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {recentGens.map((gen) => (
                      <div key={gen.id} className="aspect-square rounded-lg overflow-hidden bg-[var(--surface-2)] group cursor-pointer relative">
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
