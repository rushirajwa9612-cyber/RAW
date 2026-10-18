import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraIcon, RefreshCw, Upload, UserRound, Users, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { prepareImageDataUrl } from '@/lib/creativeFiles';

export type SelfieMode = 'single' | 'couple';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (photo: string, mode: SelfieMode) => void;
}

export function SelfieCameraDialog({ open, onClose, onConfirm }: Props) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [mode, setMode] = useState<SelfieMode>('single');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not available in this browser.');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      } catch (firstError) {
        if (facing === 'environment') throw firstError;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Camera could not be opened.';
      setCameraError(message);
    }
  }, [facing, stopCamera]);

  useEffect(() => {
    if (!open) return;
    void startCamera();
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast('Wait for the camera preview to appear.', 'warning');
      return;
    }
    const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL('image/jpeg', 0.82));
    stopCamera();
  }

  async function chooseFile(file?: File) {
    if (!file) return;
    try {
      setPhoto(await prepareImageDataUrl(file, 'image/jpeg'));
      stopCamera();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not prepare image.', 'error');
    }
  }

  function close() {
    stopCamera();
    setPhoto(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title="Start your Selfie Studio" className="max-w-2xl">
      <p className="mb-4 text-sm text-[var(--text-secondary)]">Camera starts only while this dialog is open. Your reference image is stored privately and can be deleted with its session.</p>
      <div className="grid grid-cols-2 gap-2 mb-4" role="group" aria-label="Photo mode">
        {(['single', 'couple'] as const).map((value) => (
          <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value}
            className={`rounded-xl border p-3 text-sm flex items-center justify-center gap-2 ${mode === value ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
            {value === 'single' ? <UserRound className="h-4 w-4" /> : <Users className="h-4 w-4" />}{value === 'single' ? 'Single' : 'Couple'}
          </button>
        ))}
      </div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black flex items-center justify-center">
        {photo ? <img src={photo} alt="Reference preview" className="max-h-full max-w-full object-contain" /> : cameraError ? (
          <div className="p-6 text-center text-sm text-white"><CameraIcon className="mx-auto mb-3 h-8 w-8" />{cameraError}<p className="mt-2 text-white/70">Use the photo picker below instead.</p></div>
        ) : <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />}
        {photo && <button type="button" onClick={() => { setPhoto(null); void startCamera(); }} className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white" aria-label="Retake photo"><RefreshCw className="h-4 w-4" /></button>}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)]">
          <Upload className="h-4 w-4" /> Choose photo
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { void chooseFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
        </label>
        <div className="flex gap-2">
          {!photo && !cameraError && <Button variant="secondary" size="sm" onClick={() => { const next = facing === 'user' ? 'environment' : 'user'; setFacing(next); }}><RefreshCw className="h-4 w-4" /> Switch camera</Button>}
          {!photo && !cameraError && <Button size="sm" onClick={capture}><Camera className="h-4 w-4" /> Capture</Button>}
          {photo && <Button size="sm" onClick={() => { const confirmed = photo; setPhoto(null); stopCamera(); onConfirm(confirmed, mode); onClose(); }}>Use this photo</Button>}
          <Button size="sm" variant="ghost" onClick={close}><X className="h-4 w-4" /> Cancel</Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--text-tertiary)]">AI identity matching is approximate, not guaranteed. For Couple mode, include both people in the reference photo.</p>
    </Dialog>
  );
}
