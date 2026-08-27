// components/admin/StatusBadge.tsx
// Badge de status genérico do painel admin — nunca depende só de cor
// (sempre mostra o texto do rótulo).
const STYLES: Record<string, string> = {
  AVAILABLE: "bg-green-50 text-green-600",
  ACTIVE: "bg-green-50 text-green-600",
  REDEEMED: "bg-[#007BFF]/10 text-[#007BFF]",
  DISABLED: "bg-slate-100 text-slate-500",
  EXPIRED: "bg-red-50 text-red-500",
  REVOKED: "bg-red-50 text-red-500",
};

export default function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${STYLES[status] ?? "bg-slate-100 text-slate-500"}`}>
      {label}
    </span>
  );
}
