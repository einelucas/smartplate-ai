// components/social/HashtagText.tsx
// Renderiza texto livre com hashtags clicáveis (#corrida -> /community/
// hashtag/corrida). Usa a MESMA extração do backend (lib/community/
// hashtags.ts) — nunca um regex próprio, pra nunca divergir do que conta
// como hashtag válida.
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { findHashtagTokens } from "@/lib/community/hashtags";

export default function HashtagText({ text, linkClassName }: { text: string; linkClassName?: string }) {
  const tokens = findHashtagTokens(text);
  if (tokens.length === 0) return <>{text}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  tokens.forEach((token, i) => {
    if (token.start > cursor) parts.push(text.slice(cursor, token.start));
    parts.push(
      <Link
        key={`${token.normalized}-${i}`}
        href={`/community/hashtag/${token.normalized}`}
        onClick={(e) => e.stopPropagation()}
        className={linkClassName ?? "text-[#007BFF] font-medium hover:underline"}
      >
        {token.raw}
      </Link>
    );
    cursor = token.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}
