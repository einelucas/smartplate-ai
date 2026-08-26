// components/social/FriendsPanel.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, Check, Ban, UserMinus } from "lucide-react";
import {
  useBlockedUsers,
  useFriends,
  useRemoveOrCancelFriend,
  useRespondFriendRequest,
  useSearchUsers,
  useSendFriendRequest,
  useUnblockUser,
} from "@/hooks/useCommunity";
import type { BlockedUserEntry, FriendEntry, SocialUserSummary } from "@/types/community";
import Avatar from "./Avatar";

type Tab = "friends" | "requests" | "search" | "blocked";

export default function FriendsPanel({
  onClose,
  initialTab = "friends",
}: {
  onClose: () => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");

  const { data: friendsData, isLoading: friendsLoading } = useFriends();
  const { data: searchData, isLoading: searchLoading } = useSearchUsers(query);
  const { data: blockedData, isLoading: blockedLoading } = useBlockedUsers();
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondFriendRequest();
  const removeOrCancel = useRemoveOrCancelFriend();
  const unblockUser = useUnblockUser();

  const accepted = friendsData?.accepted ?? [];
  const incoming = friendsData?.incomingPending ?? [];
  const outgoing = friendsData?.outgoingPending ?? [];
  const users = searchData?.users ?? [];
  const blocked = blockedData?.blocks ?? [];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "friends", label: "Amigos", count: accepted.length },
    { id: "requests", label: "Solicitações", count: incoming.length },
    { id: "search", label: "Buscar" },
    { id: "blocked", label: "Bloqueados", count: blocked.length },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Amigos</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="flex px-5 pt-4 gap-1 border-b border-slate-100">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.id ? "border-[#007BFF] text-[#007BFF]" : "border-transparent text-slate-400"
                }`}
              >
                {t.label}
                {!!t.count && <span className="ml-1 text-xs">({t.count})</span>}
              </button>
            ))}
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-3">
            {tab === "friends" && (
              <>
                {friendsLoading && <p className="text-sm text-slate-400">Carregando...</p>}
                {!friendsLoading && accepted.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Adicione amigos para comparar sua consistência e participar de desafios juntos.
                  </p>
                )}
                {accepted.map((f: FriendEntry) => (
                  <div key={f.friendshipId} className="flex items-center gap-3">
                    <Avatar avatarUrl={f.avatarUrl} name={f.displayName || "U"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{f.displayName}</p>
                      <p className="text-xs text-slate-400">@{f.username}</p>
                    </div>
                    <button
                      onClick={() => removeOrCancel.mutate(f.friendshipId)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Remover amigo"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {tab === "requests" && (
              <>
                {incoming.length === 0 && outgoing.length === 0 && (
                  <p className="text-sm text-slate-500">Nenhuma solicitação pendente.</p>
                )}
                {incoming.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Recebidas</p>
                    {incoming.map((f: FriendEntry) => (
                      <div key={f.friendshipId} className="flex items-center gap-3 mb-2">
                        <Avatar avatarUrl={f.avatarUrl} name={f.displayName || "U"} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{f.displayName}</p>
                        </div>
                        <button
                          onClick={() => respondRequest.mutate({ friendshipId: f.friendshipId, action: "accept" })}
                          className="p-2 text-white bg-[#28A745] hover:bg-[#219a3a] rounded-lg"
                          title="Aceitar"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => respondRequest.mutate({ friendshipId: f.friendshipId, action: "decline" })}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          title="Recusar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {outgoing.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2 mt-3">Enviadas</p>
                    {outgoing.map((f: FriendEntry) => (
                      <div key={f.friendshipId} className="flex items-center gap-3 mb-2">
                        <Avatar avatarUrl={f.avatarUrl} name={f.displayName || "U"} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{f.displayName}</p>
                        </div>
                        <button
                          onClick={() => removeOrCancel.mutate(f.friendshipId)}
                          className="text-xs text-slate-500 hover:text-red-500 font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "search" && (
              <>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome de usuário..."
                    className="w-full bg-slate-100 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none"
                  />
                </div>
                {query.trim().length > 0 && query.trim().length < 2 && (
                  <p className="text-xs text-slate-400">Digite ao menos 2 caracteres.</p>
                )}
                {searchLoading && <p className="text-sm text-slate-400">Buscando...</p>}
                {users.map((u: SocialUserSummary) => (
                  <div key={u.userId} className="flex items-center gap-3">
                    <Avatar avatarUrl={u.avatarUrl} name={u.displayName || "U"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{u.displayName}</p>
                      <p className="text-xs text-slate-400">@{u.username}</p>
                    </div>
                    <button
                      onClick={() => sendRequest.mutate(u.userId)}
                      disabled={sendRequest.isPending}
                      className="p-2 text-white bg-[#007BFF] hover:bg-[#0056b3] rounded-lg disabled:opacity-50"
                      title="Enviar solicitação"
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {tab === "blocked" && (
              <>
                {blockedLoading && <p className="text-sm text-slate-400">Carregando...</p>}
                {!blockedLoading && blocked.length === 0 && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <Ban size={14} className="flex-shrink-0" /> Nenhum usuário bloqueado. Você pode bloquear alguém pelo menu dos posts dela.
                  </p>
                )}
                {blocked.map((b: BlockedUserEntry) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <Avatar avatarUrl={null} name={b.displayName || "U"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{b.displayName}</p>
                      <p className="text-xs text-slate-400">@{b.username}</p>
                    </div>
                    <button
                      onClick={() => unblockUser.mutate(b.userId)}
                      disabled={unblockUser.isPending}
                      className="text-xs text-slate-500 hover:text-[#007BFF] font-medium disabled:opacity-50"
                    >
                      Desbloquear
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
