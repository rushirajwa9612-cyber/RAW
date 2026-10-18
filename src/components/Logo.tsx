import { Sparkles } from 'lucide-react';

export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-xl"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
        }}
      >
        <Sparkles className="text-[var(--bg-base)]" style={{ width: size * 0.55, height: size * 0.55 }} />
      </div>
      <span
        className="font-display font-bold tracking-tight text-[var(--text-primary)]"
        style={{ fontSize: size * 0.5 }}
      >
        RAW 2.0
      </span>
    </div>
  );
}
