// components/social/PostComposerProvider.tsx
// Dono único e global do PostComposerModal. Qualquer tela pode abrir o mesmo
// Composer (com um attachment já resolvido) via useOpenPostComposer() — sem
// isso, cada fluxo (registrar atividade, celebrar conquista, ver atividade
// Strava...) precisaria manter seu próprio modal de publicação, que é
// exatamente o problema que esta tarefa corrige.
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { PostAttachment } from "@/lib/community/post-draft";

const PostComposerModal = dynamic(() => import("./PostComposerModal"), { ssr: false });

export interface OpenComposerOptions {
  attachment?: PostAttachment;
  /** Trava o destino num grupo específico (composer aberto de dentro de um grupo) — some o seletor de destino. */
  groupId?: string;
}

interface ComposerContextValue {
  openComposer: (options?: OpenComposerOptions) => void;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

// Escape hatch pra código que roda FORA da árvore React do provider — hoje
// só os toasts de conquista/streak (react-hot-toast monta <Toaster/> como
// portal próprio, fora do <PostComposerProvider>, então useContext ali
// sempre retornaria null). Funciona só depois do provider montar.
let globalOpenComposer: ((options?: OpenComposerOptions) => void) | null = null;

export function openPostComposer(options?: OpenComposerOptions) {
  globalOpenComposer?.(options);
}

export function PostComposerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<OpenComposerOptions>({});

  const openComposer = useCallback((opts?: OpenComposerOptions) => {
    setOptions(opts ?? {});
    setIsOpen(true);
  }, []);

  useEffect(() => {
    globalOpenComposer = openComposer;
    return () => {
      if (globalOpenComposer === openComposer) globalOpenComposer = null;
    };
  }, [openComposer]);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <ComposerContext.Provider value={{ openComposer }}>
      {children}
      {isOpen && (
        <PostComposerModal
          key={isOpen ? "open" : "closed"}
          initialAttachment={options.attachment ?? null}
          fixedGroupId={options.groupId}
          onClose={close}
        />
      )}
    </ComposerContext.Provider>
  );
}

export function useOpenPostComposer(): (options?: OpenComposerOptions) => void {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error("useOpenPostComposer precisa estar dentro de <PostComposerProvider>");
  return ctx.openComposer;
}
