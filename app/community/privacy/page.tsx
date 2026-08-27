// app/community/privacy/page.tsx
// Primeira tela a expor os 4 toggles de privacidade social (isDiscoverable/
// showStreak/showXp/showAchievements) — já existiam no schema e já eram
// aplicados de verdade (busca de usuários, ranking), mas nenhuma UI permitia
// o usuário mudá-los. Usa o mesmo endpoint que /api/community/me já aceitava.
"use client";

import Link from "next/link";
import { ArrowLeft, Lock, Bell, VolumeX, Volume2 } from "lucide-react";
import {
  useCommunityMe,
  useUpdateCommunityProfile,
  useFeedMutes,
  useUnmuteUser,
  useContentMutes,
  useMutePostType,
  useUnmutePostType,
} from "@/hooks/useCommunity";

const POST_TYPE_LABELS: Record<string, string> = {
  TEXT: "Publicações de texto",
  ACHIEVEMENT: "Conquistas",
  STREAK: "Marcos de sequência",
  CHALLENGE: "Desafios",
  PLAN_SHARE: "Alimentação (planos/refeições)",
  ACTIVITY: "Atividades físicas",
  EXTERNAL_SHARE: "Compartilhados de outros apps",
};

type PrivacyKey = "isDiscoverable" | "showStreak" | "showXp" | "showAchievements";
type NotificationKey =
  | "notifySocial"
  | "notifyMeals"
  | "notifyActivities"
  | "notifyChallenges"
  | "notifyStreak"
  | "notifyProgress"
  | "notifyReminders";

interface ToggleConfig<K extends string> {
  key: K;
  label: string;
  description: string;
}

const PRIVACY_TOGGLES: ToggleConfig<PrivacyKey>[] = [
  {
    key: "isDiscoverable",
    label: "Aparecer na busca de usuários",
    description: "Outras pessoas conseguem te encontrar pelo nome de usuário na Comunidade.",
  },
  {
    key: "showStreak",
    label: "Mostrar minha sequência",
    description: "Sua sequência de dias ativos aparece no seu perfil público e no ranking.",
  },
  {
    key: "showXp",
    label: "Mostrar meu XP",
    description: "Seu XP total aparece no seu perfil público e no ranking da Comunidade.",
  },
  {
    key: "showAchievements",
    label: "Mostrar minhas conquistas",
    description: "Suas conquistas desbloqueadas ficam visíveis para outros usuários.",
  },
];

// Gatilho real hoje: Social (pedido/aceite de amizade, comentário, reação,
// convite de grupo), Atividades (meta semanal batida), Desafios (desafio de
// grupo iniciado/concluído), Sequência (marco de streak desbloqueado) e
// Progresso (demais conquistas). Refeições e Lembretes continuam só
// disponíveis pra configurar, sem nenhum gatilho ainda — não há conceito
// confiável de horário de refeição nem infraestrutura de agendamento no
// projeto (checklist seção 26); nunca marcadas como "implementadas" sem ter
// nenhuma notificação real associada.
const NOTIFICATION_TOGGLES: ToggleConfig<NotificationKey>[] = [
  { key: "notifySocial", label: "Social", description: "Solicitações de amizade, comentários e reações nas suas publicações." },
  { key: "notifyMeals", label: "Refeições", description: "Avisos relacionados ao seu plano alimentar." },
  { key: "notifyActivities", label: "Atividades", description: "Quando você bate uma meta semanal de atividade física." },
  { key: "notifyChallenges", label: "Desafios", description: "Novidades sobre desafios dos seus grupos." },
  { key: "notifyStreak", label: "Sequência", description: "Avisos sobre sua sequência de dias ativos." },
  { key: "notifyProgress", label: "Progresso", description: "Conquistas desbloqueadas e marcos de progresso." },
  { key: "notifyReminders", label: "Lembretes", description: "Lembretes gerais do SmartPlate." },
];

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
        checked ? "bg-[#007BFF]" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function PrivacyPage() {
  const { data, isLoading } = useCommunityMe();
  const updateProfile = useUpdateCommunityProfile();
  const { data: feedMutesData } = useFeedMutes();
  const unmuteUser = useUnmuteUser();
  const { data: contentMutesData } = useContentMutes();
  const mutePostType = useMutePostType();
  const unmutePostType = useUnmutePostType();

  const profile = data?.profile;
  const mutedTypes = new Set(contentMutesData?.mutedTypes ?? []);
  const mutedUsers = feedMutesData?.mutes ?? [];

  const toggle = (key: PrivacyKey | NotificationKey) => {
    if (!profile) return;
    updateProfile.mutate({ [key]: !profile[key] });
  };

  const toggleContentType = (postType: string) => {
    if (mutedTypes.has(postType)) unmutePostType.mutate(postType);
    else mutePostType.mutate(postType);
  };

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Lock size={18} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Privacidade</h1>
          <p className="text-sm text-slate-400">O que outras pessoas veem de você na Comunidade</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Carregando...</p>}

      {profile && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
            {PRIVACY_TOGGLES.map((item) => (
              <div key={item.key} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                </div>
                <ToggleSwitch checked={profile[item.key]} onChange={() => toggle(item.key)} disabled={updateProfile.isPending} />
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={16} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-700">Notificações</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
              {NOTIFICATION_TOGGLES.map((item) => (
                <div key={item.key} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                  </div>
                  <ToggleSwitch checked={profile[item.key]} onChange={() => toggle(item.key)} disabled={updateProfile.isPending} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <VolumeX size={16} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-700">Silenciar tipos de conteúdo</h2>
            </div>
            <p className="text-xs text-slate-400 mb-3">Publicações destes tipos deixam de aparecer no seu feed — ninguém é notificado.</p>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
              {Object.entries(POST_TYPE_LABELS).map(([postType, label]) => (
                <div key={postType} className="p-4 flex items-center gap-4">
                  <p className="text-sm font-medium text-slate-800 flex-1 min-w-0">{label}</p>
                  <ToggleSwitch checked={!mutedTypes.has(postType)} onChange={() => toggleContentType(postType)} disabled={mutePostType.isPending || unmutePostType.isPending} />
                </div>
              ))}
            </div>
          </div>

          {mutedUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <VolumeX size={16} className="text-slate-500" />
                <h2 className="text-sm font-bold text-slate-700">Usuários silenciados</h2>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                {mutedUsers.map((mute: { id: string; userId: string; username?: string | null; displayName?: string | null }) => (
                  <div key={mute.id} className="p-4 flex items-center gap-4">
                    <p className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">
                      {mute.username ? `@${mute.username}` : mute.displayName ?? "Usuário"}
                    </p>
                    <button
                      onClick={() => unmuteUser.mutate(mute.userId)}
                      disabled={unmuteUser.isPending}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#007BFF] hover:text-[#0056b3] disabled:opacity-50"
                    >
                      <Volume2 size={14} /> Reativar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
