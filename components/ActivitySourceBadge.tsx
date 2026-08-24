// components/ActivitySourceBadge.tsx
// Badge de origem para o histórico PRIVADO de atividades (SmartPlate vs.
// provider externo). Reutilizável — qualquer provider futuro (Garmin, Apple
// Health...) só precisa existir em lib/integrations/provider-display.ts.
import ProviderIcon from "@/components/ProviderIcon";
import { getProviderDisplay } from "@/lib/integrations/provider-display";
import { Lock } from "lucide-react";

export default function ActivitySourceBadge({
  source,
  showLock = false,
}: {
  source: string;
  /** true para fontes de provider externo — nunca para MANUAL. */
  showLock?: boolean;
}) {
  const display = getProviderDisplay(source);

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
      <ProviderIcon provider={source} size={10} className={display.accentClassName} />
      {display.label}
      {showLock && <Lock size={9} className="text-slate-400" />}
    </span>
  );
}
