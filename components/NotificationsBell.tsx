// components/NotificationsBell.tsx
// Sino de notificações global (renderizado pelo AppSidebar em toda página
// autenticada). Combina duas fontes: solicitações de amizade pendentes
// (derivadas do Friendship existente, sem leitura/não-leitura própria — some
// da lista assim que é respondida) e notificações reais persistidas
// (Notification — hoje só "desafio concluído", ver lib/community/
// gamification.ts).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, X, Users, Trophy } from "lucide-react";
import { useFriends, useRespondFriendRequest } from "@/hooks/useCommunity";
import { useNotifications, useMarkAllNotificationsRead } from "@/hooks/useNotifications";
import type { FriendEntry } from "@/types/community";

function Avatar({ avatarUrl, name }: { avatarUrl?: string | null; name: string }) {
  return (
    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 overflow-hidden">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data } = useFriends();
  const respondRequest = useRespondFriendRequest();
  const { data: notificationsData } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const incoming = data?.incomingPending ?? [];
  const notifications = notificationsData?.notifications ?? [];
  const unreadNotificationCount = notificationsData?.unreadCount ?? 0;
  const count = incoming.length + unreadNotificationCount;

  return (
    <div className="relative">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          // Marca como lidas ao abrir — não deixamos um "toggle falso": o
          // contador some de verdade, persistido no banco.
          if (next && unreadNotificationCount > 0) markAllRead.mutate();
        }}
        className="relative w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
      >
        <Bell size={18} className="text-slate-600" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[10px] font-bold text-white leading-none">{count > 9 ? "9+" : count}</span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 bg-white border border-slate-100 shadow-lg rounded-2xl max-h-96 overflow-y-auto z-40"
            >
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm">Notificações</h3>
              </div>

              {incoming.length === 0 && notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="mx-auto text-slate-300 mb-2" size={24} />
                  <p className="text-sm text-slate-400">Nenhuma notificação nova.</p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                      <div className="w-9 h-9 flex-shrink-0 bg-amber-50 rounded-full flex items-center justify-center">
                        <Trophy size={16} className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-medium">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                      </div>
                    </div>
                  ))}
                  {incoming.map((f: FriendEntry) => (
                    <div key={f.friendshipId} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                      <Avatar avatarUrl={f.avatarUrl} name={f.displayName || "U"} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold">{f.displayName}</span> quer ser seu amigo
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => respondRequest.mutate({ friendshipId: f.friendshipId, action: "accept" })}
                            disabled={respondRequest.isPending}
                            className="flex items-center gap-1 text-xs font-medium bg-[#28A745] hover:bg-[#219a3a] text-white rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                          >
                            <Check size={12} /> Aceitar
                          </button>
                          <button
                            onClick={() => respondRequest.mutate({ friendshipId: f.friendshipId, action: "decline" })}
                            disabled={respondRequest.isPending}
                            className="flex items-center gap-1 text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                          >
                            <X size={12} /> Recusar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/community");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-[#007BFF] hover:text-[#0056b3] py-1.5"
                >
                  <Users size={14} /> Ver Comunidade
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
