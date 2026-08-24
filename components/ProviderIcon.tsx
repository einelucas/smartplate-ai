// components/ProviderIcon.tsx
// Único lugar que decide "logo real do app OU ícone genérico" para qualquer
// provider externo (Strava, Garmin, Apple, Samsung, Nike, Adidas, Fitbit).
// Nunca resolver isso manualmente em cada componente — sempre passar por
// aqui, igual ao padrão de components/icon-registry.tsx.
"use client";

import { resolveIcon } from "@/components/icon-registry";
import { resolveBrandIcon } from "@/lib/integrations/brand-icons";
import { getProviderDisplay } from "@/lib/integrations/provider-display";

export default function ProviderIcon({
  provider,
  size = 20,
  className,
}: {
  provider: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const BrandIcon = resolveBrandIcon(provider);
  if (BrandIcon) return <BrandIcon size={size} className={className} />;

  const display = getProviderDisplay(provider);
  const FallbackIcon = resolveIcon(display.icon);
  return <FallbackIcon size={size} weight="duotone" className={className} />;
}
