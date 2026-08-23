// app/community/page.tsx
"use client";

import { useState } from "react";
import CommunityHeader from "@/components/social/CommunityHeader";
import SocialFeed from "@/components/social/SocialFeed";
import GroupsOverview from "@/components/social/GroupsOverview";

export default function CommunityPage() {
  const [section, setSection] = useState<"geral" | "grupos">("geral");

  return (
    <div className="p-4 sm:p-8">
      <CommunityHeader />

      <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-full sm:w-fit mb-6">
        <button
          onClick={() => setSection("geral")}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            section === "geral" ? "bg-[#007BFF] text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Geral
        </button>
        <button
          onClick={() => setSection("grupos")}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            section === "grupos" ? "bg-[#007BFF] text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Meus Grupos
        </button>
      </div>

      {section === "geral" ? <SocialFeed /> : <GroupsOverview />}
    </div>
  );
}
