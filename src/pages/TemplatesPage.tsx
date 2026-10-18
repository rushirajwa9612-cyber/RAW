import { useEffect, useState } from 'react';
import { Layout, Search, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCreation } from '@/context/CreationContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/context/RouterContext';
import type { Template } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState } from '@/components/ui/Feedback';

const builtInTemplates: Omit<Template, 'id' | 'created_at'>[] = [
  { title: 'Cinematic Portrait', category: 'Portrait', description: 'Dramatic studio portrait with cinematic lighting', prompt: 'Cinematic portrait of a person, dramatic rim lighting, shallow depth of field, film grain, moody atmosphere', type: 'image', model: 'default', aspect_ratio: '3:2', style_preset: 'cinematic', preview_url: 'https://images.pexels.com/photos/9067815/pexels-photo-9067815.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 1, is_featured: true, negative_prompt: null },
  { title: 'Fantasy Landscape', category: 'Landscape', description: 'Ethereal fantasy world with mystical elements', prompt: 'Ethereal fantasy landscape, floating islands, mystical glowing flora, aurora sky, ultra detailed digital painting', type: 'image', model: 'default', aspect_ratio: '16:9', style_preset: 'fantasy', preview_url: 'https://images.pexels.com/photos/10109585/pexels-photo-10109585.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 2, is_featured: true, negative_prompt: null },
  { title: 'Cyberpunk City', category: 'Sci-Fi', description: 'Neon-lit futuristic city at night', prompt: 'Cyberpunk city street at night, towering neon signs, rain-soaked streets with reflections, moody atmosphere, blade runner aesthetic', type: 'image', model: 'default', aspect_ratio: '16:9', style_preset: 'cinematic', preview_url: 'https://images.pexels.com/photos/18545016/pexels-photo-18545016.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 3, is_featured: true, negative_prompt: null },
  { title: 'Abstract Art', category: 'Abstract', description: 'Vibrant abstract composition with dynamic shapes', prompt: 'Vibrant abstract digital art, flowing geometric shapes, bold colors, dynamic composition, ultra detailed', type: 'image', model: 'default', aspect_ratio: '1:1', style_preset: 'digital-art', preview_url: 'https://images.pexels.com/photos/30784971/pexels-photo-30784971.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 4, is_featured: false, negative_prompt: null },
  { title: 'Moody Portrait', category: 'Portrait', description: 'Dark dramatic portrait with shadow play', prompt: 'Dramatic portrait in shadows, single light source, intense expression, black background, high contrast', type: 'image', model: 'default', aspect_ratio: '1:1', style_preset: 'photorealistic', preview_url: 'https://images.pexels.com/photos/15649980/pexels-photo-15649980.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 5, is_featured: false, negative_prompt: null },
  { title: 'Golden Mountains', category: 'Landscape', description: 'Majestic mountain peaks at golden hour', prompt: 'Majestic mountain range at golden hour, dramatic clouds, sun rays breaking through, ultra wide landscape photography', type: 'image', model: 'default', aspect_ratio: '16:9', style_preset: 'photorealistic', preview_url: 'https://images.pexels.com/photos/17917581/pexels-photo-17917581.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 6, is_featured: false, negative_prompt: null },
  { title: 'Fashion Editorial', category: 'Fashion', description: 'High-fashion studio photography style', prompt: 'High fashion editorial portrait, studio lighting, elegant pose, designer clothing, magazine quality', type: 'image', model: 'default', aspect_ratio: '3:2', style_preset: 'photorealistic', preview_url: 'https://images.pexels.com/photos/34921744/pexels-photo-34921744.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 7, is_featured: false, negative_prompt: null },
  { title: 'Cosmic Nebula', category: 'Sci-Fi', description: 'Breathtaking cosmic nebula in deep space', prompt: 'Stunning cosmic nebula in deep space, vibrant gas clouds, distant stars, hubble telescope style, ultra high detail', type: 'image', model: 'default', aspect_ratio: '16:9', style_preset: 'digital-art', preview_url: 'https://images.pexels.com/photos/4233216/pexels-photo-4233216.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 8, is_featured: true, negative_prompt: null },
  { title: 'Misty Forest', category: 'Landscape', description: 'Atmospheric foggy forest scene', prompt: 'Misty forest at dawn, fog between tall trees, soft light filtering through, atmospheric, mysterious mood', type: 'image', model: 'default', aspect_ratio: '4:3', style_preset: 'cinematic', preview_url: 'https://images.pexels.com/photos/13491656/pexels-photo-13491656.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 9, is_featured: false, negative_prompt: null },
  { title: 'Product Splash', category: 'Product', description: 'Dynamic product shot with liquid splash', prompt: 'Product photography with dynamic water splash, studio lighting, dark background, commercial quality, ultra sharp', type: 'image', model: 'default', aspect_ratio: '1:1', style_preset: 'photorealistic', preview_url: 'https://images.pexels.com/photos/35667390/pexels-photo-35667390.png?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 10, is_featured: false, negative_prompt: null },
  { title: 'Anime Character', category: 'Anime', description: 'Anime-style character illustration', prompt: 'Anime style character illustration, expressive eyes, detailed hair, vibrant colors, studio ghibli inspired', type: 'image', model: 'default', aspect_ratio: '9:16', style_preset: 'anime', preview_url: 'https://images.pexels.com/photos/31403466/pexels-photo-31403466.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 11, is_featured: false, negative_prompt: null },
  { title: 'Neon Portrait', category: 'Portrait', description: 'Portrait with dramatic neon lighting', prompt: 'Portrait with dramatic neon lighting, red and blue light, dark setting, cinematic mood, ultra detailed', type: 'image', model: 'default', aspect_ratio: '1:1', style_preset: 'cinematic', preview_url: 'https://images.pexels.com/photos/15901127/pexels-photo-15901127.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', settings: {}, sort_order: 12, is_featured: false, negative_prompt: null },
];

export function TemplatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const { setPending } = useCreation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    async function loadTemplates() {
      const { data } = await supabase.from('templates').select('*').order('sort_order', { ascending: true });
      let templates = (data as Template[]) ?? [];

      if (templates.length === 0) {
        if (user) {
          await supabase.from('templates').insert(
            builtInTemplates.map((t) => ({ ...t }))
          );
          const { data: reloaded } = await supabase.from('templates').select('*').order('sort_order', { ascending: true });
          templates = (reloaded as Template[]) ?? [];
        } else {
          templates = builtInTemplates.map((t, i) => ({ ...t, id: `builtin-${i}`, created_at: new Date().toISOString() })) as Template[];
        }
      }

      setTemplates(templates);
      setLoading(false);
    }
    loadTemplates();
  }, [user]);

  const categories = ['All', ...Array.from(new Set(templates.map((t) => t.category)))];

  const filtered = templates.filter((t) => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || t.category === category;
    return matchesSearch && matchesCategory;
  });

  function applyTemplate(template: Template) {
    const target = template.type === 'video' ? '/video' : template.type === 'edit' ? '/edit' : '/image';
    setPending({
      prompt: template.prompt,
      negativePrompt: template.negative_prompt || undefined,
      aspectRatio: template.aspect_ratio,
      stylePreset: template.style_preset || undefined,
      model: template.model || undefined,
      type: template.type,
    });
    toast(`Template "${template.title}" loaded into creator.`, 'success');
    navigate(target);
  }

  if (loading) return <LoadingState message="Loading templates..." />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Layout className="h-6 w-6 text-[var(--accent)]" />
          Templates
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Start from a curated template and customize it to make it yours.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-4 py-2 text-sm whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-[var(--accent)] text-[var(--bg-base)] font-medium'
                  : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Layout className="h-12 w-12" />}
          title="No templates found"
          description="Try a different search or category."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((template) => (
            <div key={template.id} className="card card-hover overflow-hidden group">
              <div className="aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
                {template.preview_url && (
                  <img
                    src={template.preview_url}
                    alt={template.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-[var(--text-primary)]">{template.title}</h3>
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">{template.category}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-tertiary)] line-clamp-2">{template.description}</p>
                <p className="mt-2 text-xs text-[var(--text-secondary)] line-clamp-2 font-mono">{template.prompt}</p>
                <Button size="sm" className="w-full mt-3" onClick={() => applyTemplate(template)}>
                  Use Template
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
