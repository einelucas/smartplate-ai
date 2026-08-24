// components/social/ExternalProviderBadge.tsx
// Badge social "Compartilhado do/via {provider}" — usado no PostCard para
// posts EXTERNAL_SHARE. Deixa claro que o conteúdo foi compartilhado
// manualmente pelo usuário, não importado automaticamente.
import ProviderIcon from "@/components/ProviderIcon";
import { getProviderDisplay } from "@/lib/integrations/provider-display";

export default function ExternalProviderBadge({ provider }: { provider: string | null | undefined }) {
  const display = getProviderDisplay(provider);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
      <ProviderIcon provider={provider} size={13} className={display.accentClassName} />
      {display.sharedFromLabel}
    </span>
  );
}
