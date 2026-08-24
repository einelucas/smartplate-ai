"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// staleTime > 0 é o que faz a segunda visita a uma aba (Home → Profile →
// Home) reaparecer instantaneamente a partir do cache em vez de mostrar um
// novo loading a cada navegação. Queries que precisam de dados mais "ao
// vivo" (feed, comments) sobrescrevem isso localmente com um valor menor.
// refetchOnWindowFocus fica desligado para não gerar uma rajada de refetch
// toda vez que o usuário volta para a aba do navegador — a atualização após
// mutations continua explícita via invalidateQueries.
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export const ReactQueryClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Criado dentro de useState (não no escopo do módulo) para nunca
  // compartilhar um único QueryClient — e portanto o cache de dados
  // privados de um usuário — entre diferentes sessões/usuários.
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
