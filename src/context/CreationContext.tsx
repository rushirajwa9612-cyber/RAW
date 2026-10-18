import { createContext, useContext, useState, type ReactNode } from 'react';

export interface PendingCreation {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  stylePreset?: string;
  model?: string;
  type?: 'image' | 'video' | 'edit';
  selfiePhotoDataUrl?: string;
  selfieMode?: 'single' | 'couple';
}

interface CreationContextValue {
  pending: PendingCreation | null;
  setPending: (data: PendingCreation | null) => void;
  clearPending: () => void;
}

const CreationContext = createContext<CreationContextValue | undefined>(undefined);

export function CreationProvider({ children }: { children: ReactNode }) {
  const [pending, setPendingState] = useState<PendingCreation | null>(null);

  function setPending(data: PendingCreation | null) {
    setPendingState(data);
  }

  function clearPending() {
    setPendingState(null);
  }

  return (
    <CreationContext.Provider value={{ pending, setPending, clearPending }}>
      {children}
    </CreationContext.Provider>
  );
}

export function useCreation() {
  const ctx = useContext(CreationContext);
  if (!ctx) throw new Error('useCreation must be used within CreationProvider');
  return ctx;
}
