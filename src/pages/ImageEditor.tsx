import { useState, useEffect } from 'react';
import {
  Wand2, Upload, Download, RefreshCw,
  Crop, Maximize2, Eraser, Sparkles,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useCreation } from '@/context/CreationContext';
import { invokeAuthedFunction } from '@/lib/edgeFunctions';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/Feedback';

const editTools = [
  { id: 'instruct', label: 'Instruction Edit', icon: Wand2, desc: 'Describe changes in natural language' },
  { id: 'bg-remove', label: 'Background Removal', icon: Eraser, desc: 'Remove or replace the background' },
  { id: 'upscale', label: 'Upscale & Enhance', icon: Maximize2, desc: 'Increase resolution and quality' },
  { id: 'outpaint', label: 'Expand / Outpaint', icon: Crop, desc: 'Extend image beyond its borders' },
];

export function ImageEditor() {
  const { toast } = useToast();
  const { pending, clearPending } = useCreation();
  const [selectedTool, setSelectedTool] = useState('instruct');
  const [instruction, setInstruction] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [bgReplacement, setBgReplacement] = useState('transparent');
  const [outpaintDirection, setOutpaintDirection] = useState('all');
  const [showBefore, setShowBefore] = useState(false);

  useEffect(() => {
    if (pending && pending.type === 'edit') {
      if (pending.prompt) setInstruction(pending.prompt);
      clearPending();
    }
  }, [pending, clearPending]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast('Choose a PNG, JPEG, or WebP image.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Image must be under 10MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setResultUrl(null);
    };
    reader.readAsDataURL(file);
  }

  async function processEdit() {
    if (!imageUrl) {
      toast('Please upload an image first.', 'warning');
      return;
    }
    if (selectedTool === 'instruct' && !instruction.trim()) {
      toast('Please describe the edit you want.', 'warning');
      return;
    }

    setProcessing(true);

    try {
      const data = await invokeAuthedFunction<{ resultUrl?: string }>('edit-image', {
          imageUrl,
          tool: selectedTool,
          instruction: instruction.trim() || undefined,
          bgReplacement: selectedTool === 'bg-remove' ? bgReplacement : undefined,
          outpaintDirection: selectedTool === 'outpaint' ? outpaintDirection : undefined,
      });
      if (data.resultUrl) {
        setResultUrl(data.resultUrl);
        toast('Edit completed!', 'success');
      } else {
        throw new Error('No result image returned.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Edit failed.';
      toast(`Edit failed: ${errorMsg}. Make sure an AI provider is configured.`, 'error');
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    setImageUrl(null);
    setResultUrl(null);
    setInstruction('');
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-[var(--accent)]" />
          Image Editor
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Transform and enhance your images with AI-powered tools.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Controls */}
        <div className="card p-5 space-y-4 lg:sticky lg:top-0 lg:self-start">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Source Image</label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] py-8 cursor-pointer hover:border-[var(--accent)] transition-all">
              <Upload className="h-6 w-6 text-[var(--text-tertiary)]" />
              <span className="text-sm text-[var(--text-secondary)]">Click to upload</span>
              <span className="text-xs text-[var(--text-tertiary)]">PNG, JPG up to 10MB</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Edit Tool</label>
            <div className="space-y-2">
              {editTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`flex items-start gap-3 w-full rounded-lg border p-3 text-left transition-all ${
                    selectedTool === tool.id
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <tool.icon className={`h-5 w-5 shrink-0 ${selectedTool === tool.id ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`} />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{tool.label}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{tool.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedTool === 'instruct' && (
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Edit Instruction</label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g., Change the background to a beach at sunset"
                rows={3}
                className="input resize-none"
              />
            </div>
          )}

          {selectedTool === 'bg-remove' && (
            <Select label="Replacement" value={bgReplacement} onChange={(e) => setBgReplacement(e.target.value)} options={[
              { value: 'transparent', label: 'Transparent' },
              { value: 'white', label: 'White' },
              { value: 'black', label: 'Black' },
            ]} />
          )}

          {selectedTool === 'outpaint' && (
            <Select label="Direction" value={outpaintDirection} onChange={(e) => setOutpaintDirection(e.target.value)} options={[
              { value: 'all', label: 'All directions' },
              { value: 'horizontal', label: 'Horizontal only' },
              { value: 'vertical', label: 'Vertical only' },
            ]} />
          )}

          <Button className="w-full" size="lg" onClick={processEdit} loading={processing} disabled={!imageUrl}>
            <Sparkles className="h-5 w-5" />
            {processing ? 'Processing...' : 'Apply Edit'}
          </Button>

          {(imageUrl || resultUrl) && (
            <Button variant="ghost" size="sm" onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>

        {/* Canvas */}
        <div className="card p-6 min-h-[500px] flex items-center justify-center">
          {!imageUrl && !resultUrl ? (
            <EmptyState
              icon={<Wand2 className="h-12 w-12" />}
              title="No image loaded"
              description="Upload an image to start editing."
            />
          ) : processing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="shimmer rounded-xl" style={{ width: 300, height: 300 }} />
              <p className="text-sm text-[var(--text-tertiary)] flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                Processing your image...
              </p>
            </div>
          ) : resultUrl ? (
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBefore(false)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-all ${!showBefore ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}
                  >
                    After
                  </button>
                  <button
                    onClick={() => setShowBefore(true)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-all ${showBefore ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}
                  >
                    Before
                  </button>
                </div>
                <Button size="sm" variant="secondary" onClick={() => window.open(resultUrl, '_blank')}>
                  <Download className="h-4 w-4" /> Download
                </Button>
              </div>
              <div className="rounded-xl overflow-hidden bg-[var(--surface-2)]">
                <img src={showBefore ? imageUrl! : resultUrl} alt="Result" className="w-full h-auto" />
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className="rounded-xl overflow-hidden bg-[var(--surface-2)]">
                <img src={imageUrl!} alt="Source" className="w-full h-auto" />
              </div>
              <p className="mt-3 text-xs text-[var(--text-tertiary)] text-center">Source image ready. Choose a tool and apply your edit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
