// components/social/Avatar.tsx
// Avatar de lista compartilhado — antes duplicado (com pequenas variações de
// tamanho, mas sem tratamento de erro nenhum) em FriendsPanel, PostCard,
// CommentSection, GroupMembersPanel, LeaderboardCard, SocialFeed,
// ChallengeRankingModal e nos composers de post. Uma URL quebrada nunca deve
// deixar o avatar permanentemente vazio: ao falhar o carregamento, cai pras
// iniciais e nunca tenta recarregar a mesma URL (o <img> é desmontado do DOM,
// então onError não pode disparar de novo — sem risco de loop).
"use client";

import { useEffect, useState } from "react";

export default function Avatar({
  avatarUrl,
  name,
  sizeClassName = "w-10 h-10",
  textSizeClassName = "text-sm",
  fallbackClassName = "bg-slate-100 text-slate-500",
}: {
  avatarUrl?: string | null;
  name: string;
  sizeClassName?: string;
  textSizeClassName?: string;
  /** Cor de fundo/texto das iniciais quando não há foto — ex.: um card de destaque pode querer um gradiente de marca em vez do cinza padrão. */
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  // Uma URL nova (ex.: depois de trocar a foto) merece uma nova chance,
  // mesmo que a anterior tenha falhado.
  useEffect(() => setFailed(false), [avatarUrl]);

  const showImage = Boolean(avatarUrl) && !failed;

  return (
    <div
      className={`${sizeClassName} ${showImage ? "" : fallbackClassName} rounded-full flex items-center justify-center ${textSizeClassName} font-bold flex-shrink-0 overflow-hidden`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl!} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        name.charAt(0).toUpperCase() || "?"
      )}
    </div>
  );
}
