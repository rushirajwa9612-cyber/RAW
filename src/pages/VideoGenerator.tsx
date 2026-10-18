import { useState, useEffect } from 'react';
import {
  Video, Sparkles, Download, RefreshCw, AlertCircle, Upload, Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCreation } from '@/context/CreationContext';
import { invokeAuthedFunction } from '@/lib/edgeFunctions';
import type { Generation } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

const CREDITS_PER_VIDEO = 10;
const videoEnabled = import.meta.env.VITE_VIDEO_GENERATION_ENABLED === 'true';

export function VideoGenerator() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { pending, clearPending } = useCreation();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState<Generation[]>([]);

  useEffect(() => {
    if (pending) {
      setPrompt(pending.prompt || '');
      clearPending();
    }
  }, [pending, clearPending]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file.', 'error');
      return;
    }
    if (file.size > 1024 * 1024) {
      toast('Source image must be smaller than 1 MB for video generation.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSourceImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function generate() {
    if (!videoEnabled) return;
    if (!prompt.trim()) {
      toast('Please enter a prompt.', 'warning');
      return;
    }
    if (mode === 'image-to-video' && !sourceImage) {
      toast('Please upload a source image.', 'warning');
      return;
    }
    if (!user) return;
    setGenerating(true);
    try {
      const data = await invokeAuthedFunction<{ generationId: string; status: 'processing' | 'completed'; videoUrl?: string }>('generate-video', {
        prompt: prompt.trim(), sourceImage: mode === 'image-to-video' ? sourceImage : undefined,
      });
      const newJob: Generation = {
        id: data.generationId, user_id: user.id, type: 'video', prompt: prompt.trim(), negative_prompt: null,
        model: 'minimax/video-01', aspect_ratio: '16:9', resolution: null, style_preset: null, num_images: 1,
        status: data.status, result_url: data.videoUrl ?? null, result_urls: data.videoUrl ? [data.videoUrl] : [],
        thumbnail_url: null, error_message: null, provider_job_id: null,
        metadata: { duration_seconds: 6, mode }, credits_used: CREDITS_PER_VIDEO, is_favorite: false,
        created_at: new Date().toISOString(), completed_at: data.videoUrl ? new Date().toISOString() : null,
      };
      setJobs((prev) => [newJob, ...prev]);
      if (data.status === 'completed') {
        await refreshProfile();
        toast('Video generated successfully!', 'success');
      } else {
        toast('Video request accepted. It will appear here when ready.', 'success');
        void pollVideo(data.generationId);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Generation failed.';
      toast(`Video generation failed: ${errorMsg}`, 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function pollVideo(generationId: string) {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        const state = await invokeAuthedFunction<{ status: 'processing' | 'completed' | 'failed'; videoUrl?: string; error?: string }>('video-status', { generationId });
        if (state.status === 'processing') continue;
        setJobs((prev) => prev.map((job) => job.id === generationId ? {
          ...job, status: state.status, result_url: state.videoUrl ?? null,
          error_message: state.error ?? null, completed_at: state.status === 'completed' ? new Date().toISOString() : null,
        } : job));
        if (state.status === 'completed') {
          await refreshProfile();
          toast('Video generated successfully!', 'success');
        } else toast(state.error || 'Video generation failed.', 'error');
        return;
      } catch { /* transient polling failure; retry */ }
    }
    toast('Video is still processing. Check back in History shortly.', 'warning');
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Video className="h-6 w-6 text-[var(--accent)]" />
          Video Generator
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Replicate Minimax creates 6-second landscape videos from text or a source image.</p>
      </div>

      {!videoEnabled && <div role="status" className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm text-[var(--text-secondary)]">
        Video generation is currently disabled. Configure the Replicate provider and set <code>VITE_VIDEO_GENERATION_ENABLED=true</code> to enable it.
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        <div className="card p-5 space-y-4 lg:sticky lg:top-0 lg:self-start">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('text-to-video')}
                disabled={!videoEnabled}
                className={`flex-1 rounded-lg border py-2 text-sm transition-all ${mode === 'text-to-video' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
              >
                Text to Video
              </button>
              <button
                onClick={() => setMode('image-to-video')}
                disabled={!videoEnabled}
                className={`flex-1 rounded-lg border py-2 text-sm transition-all ${mode === 'image-to-video' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
              >
                Image to Video
              </button>
            </div>
          </div>

          {mode === 'image-to-video' && (
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Source Image</label>
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] py-6 cursor-pointer hover:border-[var(--accent)] transition-all">
                {sourceImage ? (
                  <img src={sourceImage} alt="Source" className="max-h-32 rounded-lg" />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-[var(--text-tertiary)]" />
                    <span className="text-xs text-[var(--text-secondary)]">Upload image</span>
                  </>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileUpload} disabled={!videoEnabled} />
              </label>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create..."
              rows={4}
              className="input resize-none"
              disabled={!videoEnabled}
            />
          </div>

          <p className="text-xs text-[var(--text-tertiary)]">Output format: 6 seconds · 16:9 landscape</p>

          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] pt-2 border-t border-[var(--border)]">
            <span>Cost: {CREDITS_PER_VIDEO} credits</span>
            <span>Balance: {profile?.credits_balance ?? 0}</span>
          </div>

          <Button className="w-full" size="lg" onClick={generate} loading={generating} disabled={!videoEnabled || !prompt.trim()}>
            <Sparkles className="h-5 w-5" />
            {generating ? 'Generating...' : 'Generate Video'}
          </Button>
        </div>

        <div className="space-y-6">
          {jobs.length === 0 ? (
            <EmptyState
              icon={<Video className="h-12 w-12" />}
              title="No videos yet"
              description="Enter a prompt and click Generate to create your first video."
            />
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{job.prompt}</p>
                </div>

                {job.status === 'processing' ? (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <div className="shimmer rounded-xl w-full max-w-md" style={{ aspectRatio: '16/9' }} />
                    <p className="text-sm text-[var(--text-tertiary)] flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin-slow" />
                      Generating video... This may take a few minutes.
                    </p>
                  </div>
                ) : job.status === 'failed' ? (
                  <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[var(--error)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-[var(--error)] font-medium">Generation failed</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{job.error_message}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl overflow-hidden bg-black">
                      <video src={job.result_url ?? ''} controls className="w-full" />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                        <span className="flex items-center gap-1"><Check className="h-3 w-3 text-[var(--success)]" /> Completed</span>
                        <span>{job.aspect_ratio}</span>
                        <span>{job.resolution}</span>
                        <span>{job.credits_used} credits</span>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => window.open(job.result_url!, '_blank')}>
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
