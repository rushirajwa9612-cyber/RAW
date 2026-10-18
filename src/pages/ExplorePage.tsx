import { useState } from 'react';
import { Compass, Search, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import { useCreation } from '@/context/CreationContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from '@/context/RouterContext';

interface ExploreItem {
  url: string;
  prompt: string;
  category: string;
  stylePreset: string;
  aspectRatio: string;
  type: 'image' | 'video';
}

const exploreItems: ExploreItem[] = [
  // Digital Art / Abstract
  { url: 'https://images.pexels.com/photos/25626510/pexels-photo-25626510.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Vibrant abstract artwork with swirling colors and dynamic textures, ultra detailed digital painting', category: 'Abstract', stylePreset: 'digital-art', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/13312407/pexels-photo-13312407.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Bright dynamic abstract art with vivid colors and textured brushstrokes, contemporary digital painting', category: 'Abstract', stylePreset: 'digital-art', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/17483850/pexels-photo-17483850.png?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Isometric illustration of a futuristic tech cityscape with AI elements, vibrant colors, detailed', category: 'Abstract', stylePreset: '3d-render', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/2268589/pexels-photo-2268589.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Dynamic abstract design with light rays and modern geometric perspectives, minimal and elegant', category: 'Abstract', stylePreset: 'minimalist', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/8669792/pexels-photo-8669792.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Abstract 3D digital art of a human figure amidst futuristic geometrical shapes, surreal composition', category: 'Abstract', stylePreset: '3d-render', aspectRatio: '1:1', type: 'image' },

  // Portraits
  { url: 'https://images.pexels.com/photos/20272960/pexels-photo-20272960.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Artistic studio portrait of a woman with brown hair, soft lighting, fashion editorial style', category: 'Portrait', stylePreset: 'photorealistic', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/18535941/pexels-photo-18535941.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Dramatic low light portrait of a man with high contrast shadows, cinematic mood, film grain', category: 'Portrait', stylePreset: 'cinematic', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/34014938/pexels-photo-34014938.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Artistic portrait of a woman with colorful dramatic lighting, neon glow, vibrant and expressive', category: 'Portrait', stylePreset: 'cinematic', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/6265198/pexels-photo-6265198.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Close-up portrait of a serious man with dramatic shadow play, intense expression, high contrast', category: 'Portrait', stylePreset: 'photorealistic', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/9534343/pexels-photo-9534343.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Stylish woman in elegant dress by a window, soft natural light, fashion photography, magazine quality', category: 'Portrait', stylePreset: 'photorealistic', aspectRatio: '3:2', type: 'image' },

  // Landscapes
  { url: 'https://images.pexels.com/photos/17827032/pexels-photo-17827032.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Expansive view of lush green hills and distant mountains under dramatic cloudy sky, golden hour', category: 'Landscape', stylePreset: 'photorealistic', aspectRatio: '16:9', type: 'image' },
  { url: 'https://images.pexels.com/photos/1675183/pexels-photo-1675183.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Rugged rocky cliff illuminated by early morning sun, surrounded by lush greenery, landscape photography', category: 'Landscape', stylePreset: 'photorealistic', aspectRatio: '4:3', type: 'image' },
  { url: 'https://images.pexels.com/photos/39876037/pexels-photo-39876037.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Mystical mountain landscape with fog and coniferous trees, moody atmosphere, black and white aesthetic', category: 'Landscape', stylePreset: 'cinematic', aspectRatio: '16:9', type: 'image' },
  { url: 'https://images.pexels.com/photos/28350399/pexels-photo-28350399.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Snow-capped mountains overlooking a lush green valley with golden fields, breathtaking panoramic view', category: 'Landscape', stylePreset: 'photorealistic', aspectRatio: '16:9', type: 'image' },
  { url: 'https://images.pexels.com/photos/19407213/pexels-photo-19407213.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Snowcapped mountains and forest under clear blue sky, crisp alpine landscape, ultra detailed', category: 'Landscape', stylePreset: 'photorealistic', aspectRatio: '4:3', type: 'image' },

  // Sci-Fi
  { url: 'https://images.pexels.com/photos/26765065/pexels-photo-26765065.png?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Digital matrix with diagonal green binary code lines on dark background, cyberpunk aesthetic', category: 'Sci-Fi', stylePreset: 'cinematic', aspectRatio: '16:9', type: 'image' },
  { url: 'https://images.pexels.com/photos/33596415/pexels-photo-33596415.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Electrifying plasma ball emitting vivid purple arcs against dark background, energy and electricity', category: 'Sci-Fi', stylePreset: 'digital-art', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/4549831/pexels-photo-4549831.png?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Futuristic circuit board with intricate geometric patterns in teal and gray, tech aesthetic, ultra detailed', category: 'Sci-Fi', stylePreset: '3d-render', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/12089403/pexels-photo-12089403.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Modern abstract hallway with glowing red geometric lights, sci-fi corridor, vivid atmosphere', category: 'Sci-Fi', stylePreset: '3d-render', aspectRatio: '16:9', type: 'image' },
  { url: 'https://images.pexels.com/photos/37897851/pexels-photo-37897851.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Colorful light painting with intertwining neon trails on black backdrop, long exposure, vibrant', category: 'Sci-Fi', stylePreset: 'digital-art', aspectRatio: '1:1', type: 'image' },

  // Anime / Illustration
  { url: 'https://images.pexels.com/photos/18069161/pexels-photo-18069161.png?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Dreamlike winter scene with aurora borealis and a lone frosted tree, surreal ethereal fantasy art', category: 'Fantasy', stylePreset: 'fantasy', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/4208443/pexels-photo-4208443.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Colorful abstract illustration with flowing wave patterns and bright hues, anime-inspired background art', category: 'Fantasy', stylePreset: 'anime', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/18069859/pexels-photo-18069859.png?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Futuristic digital abstract sculpture visualizing AI networks, glowing nodes, science fiction concept art', category: 'Fantasy', stylePreset: 'fantasy', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/17483849/pexels-photo-17483849.png?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Abstract visual representation of a neural network with vibrant colors, AI technology, digital art', category: 'Fantasy', stylePreset: 'digital-art', aspectRatio: '1:1', type: 'image' },

  // Product
  { url: 'https://images.pexels.com/photos/36339062/pexels-photo-36339062.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Elegant cosmetic container on minimalist pedestals with artistic branches, luxury product photography', category: 'Product', stylePreset: 'photorealistic', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/36238538/pexels-photo-36238538.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Brown glass serum bottle encased in melting ice, minimalist product photography, clean aesthetic', category: 'Product', stylePreset: 'photorealistic', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/35976902/pexels-photo-35976902.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Minimalist cosmetic jar on marble pedestal with modern abstract design, luxury beauty product shot', category: 'Product', stylePreset: 'minimalist', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/11942004/pexels-photo-11942004.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Sleek beverage can on vibrant colored surface, commercial product photography, studio lighting', category: 'Product', stylePreset: 'photorealistic', aspectRatio: '1:1', type: 'image' },
  { url: 'https://images.pexels.com/photos/13779109/pexels-photo-13779109.jpeg?auto=compress&cs=tinysrgb&h=600&w=600', prompt: 'Clean supplement bottle on neutral background, minimalist product packaging, commercial photography', category: 'Product', stylePreset: 'minimalist', aspectRatio: '1:1', type: 'image' },
];

const categories = ['All', 'Abstract', 'Portrait', 'Landscape', 'Sci-Fi', 'Fantasy', 'Product'];

export function ExplorePage() {
  const { setPending } = useCreation();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = exploreItems.filter((item) => {
    const matchesSearch = !search || item.prompt.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  function launchCreate(item: ExploreItem) {
    setPending({
      prompt: item.prompt,
      stylePreset: item.stylePreset,
      aspectRatio: item.aspectRatio,
      type: item.type,
    });
    toast('Prompt loaded into generator. Customize and create!', 'success');
    navigate(item.type === 'video' ? '/video' : '/image');
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Compass className="h-6 w-6 text-[var(--accent)]" />
          Explore
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Discover inspiring visuals. See something you like? Launch it directly into the generator.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by style, subject, or category..."
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
        <div className="card p-12 text-center">
          <Compass className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">No results found. Try a different search or category.</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filtered.map((item, i) => (
            <div
              key={i}
              className="break-inside-avoid rounded-[var(--radius-lg)] overflow-hidden bg-[var(--surface-2)] group relative cursor-pointer"
              onClick={() => launchCreate(item)}
            >
              <img
                src={item.url}
                alt={item.prompt}
                loading="lazy"
                className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <span className="text-xs text-white/70 mb-1">{item.category}</span>
                <p className="text-xs text-white line-clamp-2 mb-2">{item.prompt}</p>
                <div className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-medium">
                  <Wand2 className="h-3.5 w-3.5" />
                  Use this prompt
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <span className="rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-xs text-white/80 capitalize">
                  {item.stylePreset}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 card p-6 text-center">
        <Sparkles className="h-8 w-8 mx-auto text-[var(--accent)] mb-2" />
        <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">Can't find what you need?</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)] mb-4">Start from scratch with a blank canvas and describe exactly what you want.</p>
        <button
          onClick={() => navigate('/image')}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--bg-base)] hover:opacity-90 transition-opacity"
        >
          <Sparkles className="h-4 w-4" />
          Open Image Generator
        </button>
      </div>
    </div>
  );
}
