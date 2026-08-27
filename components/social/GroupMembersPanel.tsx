// components/social/GroupMembersPanel.tsx
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ShieldCheck, Crown, UserMinus, UserPlus } from "lucide-react";
import { useChangeGroupMemberRole, useGroupMembers, useRemoveGroupMember } from "@/hooks/useCommunity";
import type { GroupMemberEntry } from "@/types/community";
import Avatar from "./Avatar";
import InviteUserToGroupModal from "./InviteUserToGroupModal";

const ROLE_LABELS: Record<string, string> = { OWNER: "Dono", ADMIN: "Admin", MEMBER: "Membro" };

export default function GroupMembersPanel({ groupId, myRole }: { groupId: string; myRole?: string }) {
  const { user } = useUser();
  const { data, isLoading } = useGroupMembers(groupId);
  const changeRole = useChangeGroupMemberRole(groupId);
  const removeMember = useRemoveGroupMember(groupId);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const members = data?.members ?? [];
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-[#007BFF] hover:text-[#0056b3]"
        >
          <UserPlus size={16} /> Convidar membro
        </button>
      )}
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
      {members.map((member: GroupMemberEntry) => {
        const isSelf = member.userId === user?.id;
        return (
          <div key={member.userId} className="flex items-center gap-3 p-4">
            <Avatar avatarUrl={member.avatarUrl} name={member.displayName || "U"} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {member.displayName} {isSelf && <span className="text-xs text-slate-400">(você)</span>}
              </p>
              <p className="text-xs text-slate-400">@{member.username}</p>
            </div>

            <span
              className={`flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-1 rounded-full flex-shrink-0 ${
                member.role === "OWNER" ? "bg-amber-50 text-amber-600" : member.role === "ADMIN" ? "bg-[#007BFF]/10 text-[#007BFF]" : "bg-slate-100 text-slate-500"
              }`}
            >
              {member.role === "OWNER" && <Crown size={10} />}
              {member.role === "ADMIN" && <ShieldCheck size={10} />}
              {ROLE_LABELS[member.role] ?? member.role}
            </span>

            {canManage && !isSelf && member.role !== "OWNER" && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {myRole === "OWNER" && (
                  <select
                    value={member.role}
                    onChange={(e) => changeRole.mutate({ userId: member.userId, role: e.target.value as "ADMIN" | "MEMBER" })}
                    className="text-xs border border-slate-200 rounded-lg px-1.5 py-1"
                  >
                    <option value="MEMBER">Membro</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                )}
                <button
                  onClick={() => confirm(`Remover ${member.displayName} do grupo?`) && removeMember.mutate(member.userId)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  title="Remover do grupo"
                >
                  <UserMinus size={14} />
                </button>
              </div>
            )}
          </div>
        );
      })}
      </div>

      {showInviteModal && <InviteUserToGroupModal groupId={groupId} onClose={() => setShowInviteModal(false)} />}
    </div>
  );
}
