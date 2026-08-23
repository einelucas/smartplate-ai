// components/social/GroupSettingsMenu.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Pencil, LogOut, Trash2, Crown } from "lucide-react";
import {
  useDeleteGroup,
  useGroupMembers,
  useLeaveGroup,
  useUpdateGroup,
} from "@/hooks/useCommunity";
import type { GroupMemberEntry } from "@/types/community";

export default function GroupSettingsMenu({
  groupId,
  myRole,
  name,
  description,
}: {
  groupId: string;
  myRole?: string;
  name: string;
  description?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "edit" | "transfer">("menu");
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [transferTo, setTransferTo] = useState("");

  const updateGroup = useUpdateGroup(groupId);
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup();
  const { data: membersData } = useGroupMembers(mode === "transfer" ? groupId : null);

  const isOwner = myRole === "OWNER";
  const canEdit = myRole === "OWNER" || myRole === "ADMIN";
  const otherMembers = (membersData?.members ?? []).filter((m: GroupMemberEntry) => m.role !== "OWNER");

  const close = () => {
    setOpen(false);
    setMode("menu");
  };

  const handleLeave = () => {
    if (isOwner) {
      setMode("transfer");
      return;
    }
    if (!confirm("Sair deste grupo?")) return;
    leaveGroup.mutate({ groupId }, { onSuccess: () => router.push("/community") });
  };

  const handleDelete = () => {
    if (!confirm("Excluir este grupo permanentemente? Essa ação não pode ser desfeita.")) return;
    deleteGroup.mutate(groupId, { onSuccess: () => router.push("/community") });
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
        <Settings size={18} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-11 bg-white border border-slate-100 shadow-lg rounded-xl p-3 w-72 z-20"
          >
            {mode === "menu" && (
              <div className="space-y-1">
                {canEdit && (
                  <button
                    onClick={() => setMode("edit")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <Pencil size={14} /> Editar grupo
                  </button>
                )}
                <button
                  onClick={handleLeave}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  <LogOut size={14} /> {isOwner ? "Transferir e sair" : "Sair do grupo"}
                </button>
                {isOwner && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} /> Excluir grupo
                  </button>
                )}
              </div>
            )}

            {mode === "edit" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">Editar grupo</p>
                  <button onClick={close} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.slice(0, 60))}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm mb-2"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value.slice(0, 300))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm mb-2 resize-none"
                />
                <button
                  onClick={() =>
                    updateGroup.mutate(
                      { name: editName.trim(), description: editDescription.trim() },
                      { onSuccess: close }
                    )
                  }
                  disabled={updateGroup.isPending || editName.trim().length < 2}
                  className="w-full bg-[#007BFF] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            )}

            {mode === "transfer" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Crown size={14} className="text-amber-500" /> Transferir propriedade
                  </p>
                  <button onClick={close} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
                {otherMembers.length === 0 ? (
                  <p className="text-xs text-slate-500 mb-2">
                    Não há outros membros. Exclua o grupo se quiser sair definitivamente.
                  </p>
                ) : (
                  <>
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm mb-2"
                    >
                      <option value="">Selecione um membro</option>
                      {otherMembers.map((m: GroupMemberEntry) => (
                        <option key={m.userId} value={m.userId}>
                          {m.displayName}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        leaveGroup.mutate(
                          { groupId, transferToUserId: transferTo },
                          { onSuccess: () => router.push("/community") }
                        )
                      }
                      disabled={!transferTo || leaveGroup.isPending}
                      className="w-full bg-[#007BFF] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                    >
                      Transferir e sair
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
