// components/social/InviteUserToGroupModal.tsx
// Convite direcionado a um usuário específico do grupo (só OWNER/ADMIN) —
// mesmo padrão de busca de FriendsPanel.tsx, ação de convite em vez de amizade.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus } from "lucide-react";
import { useInviteUserToGroup, useSearchUsers } from "@/hooks/useCommunity";
import type { SocialUserSummary } from "@/types/community";
import Avatar from "./Avatar";

export default function InviteUserToGroupModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { data: searchData, isLoading } = useSearchUsers(query);
  const inviteUser = useInviteUserToGroup(groupId);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const users = searchData?.users ?? [];

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
          className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Convidar para o grupo</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-3">
            <div className="relative">
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
            {isLoading && <p className="text-sm text-slate-400">Buscando...</p>}
            {users.map((u: SocialUserSummary) => {
              const invited = invitedIds.has(u.userId);
              return (
                <div key={u.userId} className="flex items-center gap-3">
                  <Avatar avatarUrl={u.avatarUrl} name={u.displayName || "U"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{u.displayName}</p>
                    <p className="text-xs text-slate-400">@{u.username}</p>
                  </div>
                  <button
                    onClick={() =>
                      inviteUser.mutate(u.userId, {
                        onSuccess: () => setInvitedIds((prev) => new Set(prev).add(u.userId)),
                      })
                    }
                    disabled={inviteUser.isPending || invited}
                    className="p-2 text-white bg-[#007BFF] hover:bg-[#0056b3] rounded-lg disabled:opacity-50"
                    title={invited ? "Convite enviado" : "Convidar"}
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
