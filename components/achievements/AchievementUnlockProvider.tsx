// components/achievements/AchievementUnlockProvider.tsx
// Dono único e global da fila de "nova conquista desbloqueada". Qualquer
// fluxo que desbloqueie conquistas (refeição, favorito, troca, streak,
// social...) chama queueAchievementUnlocks(codes) — sem isso, cada fluxo
// acabava com seu próprio toast descoordenado (ver AchievementCelebration.tsx
// antigo + o efeito interno de hooks/useAchievements.tsx: dois mecanismos
// paralelos, sem fila, que podiam sobrepor toasts quando duas fontes
// desbloqueavam conquistas na mesma janela de tempo — checklist seção 23,
// "Criar fila/resumo quando várias conquistas forem desbloqueadas juntas").
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AchievementUnlockModal from "./AchievementUnlockModal";

type QueueFn = (codes: string[] | undefined | null) => void;

const AchievementUnlockContext = createContext<QueueFn | null>(null);

// Escape hatch pra código que roda fora da árvore do provider (mesmo padrão
// de openPostComposer em PostComposerProvider.tsx) — funciona só depois do
// provider montar; antes disso, enfileirar é um no-op (não há UI ainda pra
// mostrar, e o próximo GET /api/achievements re-detecta o unlock mesmo assim).
let globalQueueUnlocks: QueueFn | null = null;

export function queueAchievementUnlocks(codes: string[] | undefined | null) {
  globalQueueUnlocks?.(codes);
}

export function useQueueAchievementUnlocks(): QueueFn {
  const ctx = useContext(AchievementUnlockContext);
  return ctx ?? queueAchievementUnlocks;
}

export function AchievementUnlockProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<string[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const enqueue = useCallback<QueueFn>((codes) => {
    if (!codes || codes.length === 0) return;
    setQueue((prev) => {
      const fresh = codes.filter((code) => !seen.current.has(code));
      if (fresh.length === 0) return prev;
      fresh.forEach((code) => seen.current.add(code));
      return [...prev, ...fresh];
    });
  }, []);

  useEffect(() => {
    globalQueueUnlocks = enqueue;
    return () => {
      if (globalQueueUnlocks === enqueue) globalQueueUnlocks = null;
    };
  }, [enqueue]);

  const dismissOne = useCallback((code: string) => {
    setQueue((prev) => prev.filter((c) => c !== code));
  }, []);

  const dismissAll = useCallback(() => setQueue([]), []);

  return (
    <AchievementUnlockContext.Provider value={enqueue}>
      {children}
      {queue.length > 0 && <AchievementUnlockModal queue={queue} onDismissOne={dismissOne} onDismissAll={dismissAll} />}
    </AchievementUnlockContext.Provider>
  );
}
