# SmartPlate AI — Status consolidado de funcionalidades

> Documento consolidado do estado atual do SmartPlate AI.
>
> **Última consolidação:** 2026-08-27
>
> Este arquivo substitui a organização anterior por uma visão operacional:
>
> - **Parte 1 — Concluído:** funcionalidades implementadas e disponíveis no código.
> - **Parte 2 — Pendente para finalizar/validar:** itens já definidos, correções, QA e integrações que faltam fechar.
> - **Parte 3 — Backlog futuro:** ideias e evoluções que ainda dependem de prioridade ou decisão de produto.
>
> Comentários históricos, relatos extensos de auditoria, repetições e referências a “corrigido nesta reorganização” foram removidos. Detalhes técnicos são mantidos apenas quando ajudam a preservar regra de negócio, segurança ou arquitetura.

> **Base atual do produto:** a versão **Web é a base canônica do SmartPlate**. Regras de negócio, banco, APIs, autenticação, Premium, gamificação, comunidade, painel administrativo e integrações server-side devem continuar sendo implementados primeiro na Web/backend sempre que não dependerem de recurso nativo do dispositivo.
>
> A versão mobile deve **reutilizar a mesma base de dados, APIs e regras de negócio**, evitando criar uma segunda implementação paralela.
>
> ### Legenda de plataforma para itens pendentes
>
> - **`[WEB AGORA]`** — pode e, se priorizado, deve ser implementado/validado na versão Web atual; não precisa esperar APK.
> - **`[WEB/BACKEND]`** — pertence principalmente à API, banco ou serviços compartilhados; deve ser reutilizado por Web e Mobile.
> - **`[MOBILE — DURANTE O APK]`** — só faz sentido quando a versão Android estiver sendo construída ou adaptada.
> - **`[MOBILE — APÓS APK BASE]`** — recurso nativo que pode esperar até o APK básico estar funcional.
> - **`[iOS — QUANDO HOUVER APP iOS]`** — não deve entrar no escopo do APK Android.
>
> **Regra prática:** se uma funcionalidade não depende de API nativa do Android/iOS, execução em background do sistema, push nativo, widget, Health Connect/HealthKit ou comportamento específico de aplicativo instalado, ela permanece parte da evolução da **Web/backend**.

---

# PARTE 1 — ✅ CONCLUÍDO

## 1. Perfil, onboarding e núcleo do produto

- [x] Perfil do usuário funcional.
- [x] Onboarding integrado ao restante do produto.
- [x] Plano Semanal funcional e em uso.
- [x] Lista de Compras funcional e em uso.
- [x] Dashboard/Início integrado aos dados reais.
- [x] Assinatura com Stripe mantida.
- [x] Acesso Premium resolvido centralmente, incluindo Stripe e `PremiumGrant`.
- [x] Beta integrado ao onboarding, Perfil e gates Premium.
- [x] Nenhuma restrição Free/Premium artificial foi adicionada antes da definição final do modelo comercial.

---

## 2. Atividades físicas

### Estrutura e CRUD

- [x] Entidade `ActivityLog`.
- [x] Relação com usuário/Profile.
- [x] Registro manual de atividade.
- [x] Data/hora, tipo, duração, intensidade, observação e distância opcional.
- [x] Histórico de atividades.
- [x] Edição e exclusão.
- [x] Validação backend com Zod.
- [x] Atividades privadas por padrão.
- [x] Identificação da origem da atividade.
- [x] Proteção contra duplicidade de dados externos com `externalId`.

### Tipos suportados

- [x] Caminhada.
- [x] Corrida.
- [x] Ciclismo.
- [x] Musculação.
- [x] Natação.
- [x] Futebol.
- [x] Esportes.
- [x] Yoga.
- [x] Mobilidade.
- [x] HIIT.
- [x] Tipo personalizado.

### Integração com a interface

- [x] Ação rápida `Registrar atividade` no Início.
- [x] Resumo de atividade recente.
- [x] Minutos ativos da semana.
- [x] Quantidade de atividades no período.
- [x] Registro de atividade pela Comunidade.
- [x] Compartilhamento opcional após registrar.
- [x] Compartilhamento de atividade já existente.
- [x] Resumo de atividades no Perfil.
- [x] Atividades do mês.
- [x] Minutos ativos.
- [x] Dias ativos.
- [x] Tipo mais praticado.
- [x] Acesso ao histórico.
- [x] Evolução de consistência.

---

## 3. Metas e insights de atividade

- [x] Meta de dias ativos por semana.
- [x] Meta de minutos ativos.
- [x] Meta de quantidade de atividades.
- [x] Metas customizáveis.
- [x] Progresso da meta.
- [x] Conquista ao atingir meta.
- [x] Meta de atividade não é requisito para manter o streak geral.
- [x] Detecção de semana mais ativa.
- [x] Detecção de consistência.
- [x] Resumo semanal.
- [x] Evolução mensal.
- [x] Relação entre atividade e alimentação em insights privados.
- [x] Insights privados com IA.
- [x] Card `XP de hoje` no Dashboard com breakdown por ação do dia.

---

## 4. Hidratação

### Estrutura

- [x] Entidade `WaterLog`.
- [x] Relação formal com `Profile`.
- [x] Quantidade em ml.
- [x] Data/hora do consumo.
- [x] Meta diária em `Profile.dailyWaterGoalMl`.
- [x] Meta configurável pelo usuário.
- [x] Tratamento de timezone com timezone IANA do perfil.

### API

- [x] `GET /api/hydration/logs`.
- [x] `POST /api/hydration/logs`.
- [x] `PATCH /api/hydration/logs/[id]`.
- [x] `DELETE /api/hydration/logs/[id]`.
- [x] `GET/PATCH /api/hydration/goal`.
- [x] `GET /api/hydration/summary`.
- [x] `GET /api/hydration/history`.
- [x] Validação backend com Zod.
- [x] Verificação de ownership nas alterações e exclusões.

### Interface

- [x] Card de hidratação no Início.
- [x] Total consumido, meta, restante, percentual e barra de progresso.
- [x] Ações rápidas `+250 ml` e `+500 ml`.
- [x] Quantidade personalizada.
- [x] Desfazer registro recém-criado.
- [x] Editar e excluir pelo histórico.
- [x] Histórico diário e semanal.
- [x] Estados de loading, vazio, erro e sucesso.
- [x] Tratamento de meta atingida e consumo acima da meta.

### Gamificação

- [x] Não concede XP por copo individual.
- [x] Evento `WATER_GOAL_COMPLETED` idempotente por dia local.
- [x] Conquistas de hidratação ativadas:
  - `FIRST_WATER_LOG`
  - `FIRST_WATER_GOAL`
  - `WATER_GOAL_3_DAYS`
  - `WATER_GOAL_7_DAYS`
  - `WATER_GOAL_30_DAYS`
  - `WATER_LOGS_50`
  - `WATER_WEEK_CONSISTENCY`
- [x] `BALANCED_WEEK` ativada com dados reais de refeição, atividade e hidratação.

---

## 5. Gamificação e XP

- [x] Motor central de XP em `lib/community/gamification.ts`.
- [x] Toda concessão de XP usa `XpEvent`.
- [x] `idempotencyKey` por evento.
- [x] Retry e duplo clique não duplicam XP.
- [x] Histórico de XP persistido.
- [x] Breakdown de XP por fonte.
- [x] XP por refeição.
- [x] XP por atividade.
- [x] XP por marcos de streak.
- [x] XP por conquistas.
- [x] XP por desafios.
- [x] Limite diário para XP de atividade.
- [x] Duração mínima para atividade elegível.
- [x] Edição repetida de atividade não gera novo XP.
- [x] Exclusão/recriação não permite reciclar o teto diário.
- [x] Duplicidades externas não geram XP duplicado.

### Regra atual de atividade

- [x] Atividade válida: +10 XP.
- [x] Atividade com 30+ minutos: +5 XP.
- [x] Primeira atividade do dia: +5 XP.
- [x] Desafio concluído: XP bônus.
- [x] Conquista desbloqueada: XP conforme raridade.

---

## 6. Streak / sequência

- [x] Regra de dia qualificado centralizada.
- [x] `DailyActivity` usado como resumo diário.
- [x] Refeição pode qualificar o dia.
- [x] Atividade física pode qualificar o dia.
- [x] Não exige exercício diário.
- [x] Representa consistência geral no SmartPlate.
- [x] Timezone do usuário respeitado.
- [x] Múltiplas ações no mesmo dia não duplicam contagem.
- [x] `currentStreak` e `longestStreak` atualizados de forma idempotente.
- [x] Marcos de streak concedem XP uma única vez.

---

## 7. Níveis

- [x] Curva de XP centralizada.
- [x] `computeLevel(totalXp)`.
- [x] Cálculo de progresso para o próximo nível.
- [x] Nível exibido no Perfil e utilizado em Comunidade/Ranking.

---

## 8. Conquistas

### Sistema

- [x] Catálogo central de conquistas.
- [x] Código interno estável separado do texto de exibição.
- [x] `UserAchievement` referencia o código.
- [x] Backend é a única autoridade para desbloqueio.
- [x] `@@unique([userId, achievementCode])`.
- [x] Retry idempotente.
- [x] Frontend não consegue desbloquear arbitrariamente uma conquista.
- [x] Desbloqueio baseado em evento persistido.
- [x] Progresso incremental para refeições, peso, atividades, desafios e água.
- [x] `progress` limitado ao `target` na UI.
- [x] `unlockedAt` não muda após desbloqueio.

### Tela de conquistas

- [x] Contagem dinâmica `X / 50`.
- [x] Barra de progresso geral.
- [x] Filtros por status e categoria.
- [x] Estado desbloqueado.
- [x] Estado bloqueado.
- [x] Estado `COMING_SOON`.
- [x] Modal de detalhes.
- [x] Instrução de como desbloquear.
- [x] Progresso real nas conquistas incrementais.
- [x] Persistência após logout/login.
- [x] Raridade exibida nos cards com texto e cor.
- [x] Categorias:
  - `ONBOARDING`
  - `FOOD`
  - `HYDRATION`
  - `STREAK`
  - `PROGRESS`
  - `ACTIVITY`
  - `SOCIAL`
  - `CHALLENGE`
  - `SPECIAL`

### Conquistas de atividade

- [x] `FIRST_ACTIVITY`.
- [x] `ACTIVITIES_10`.
- [x] `ACTIVITIES_50`.
- [x] `ACTIVITIES_100`.
- [x] `ACTIVE_3_DAYS_WEEK`.
- [x] `ACTIVE_MINUTES_150`.
- [x] `ACTIVITY_EXPLORER`.
- [x] `ACTIVITY_WEEKS_CONSISTENCY`.
- [x] `ACTIVE_30_DAYS_TOTAL`.

### Alimentação + atividade

- [x] Rotina completa.
- [x] Semana equilibrada.
- [x] Consistência total.

### Progresso

- [x] Primeira foto de progresso.
- [x] Primeiro registro de peso.
- [x] 10 registros de peso.
- [x] 25 registros de peso.
- [x] Primeira meta atingida.
- [x] Consistência de registros de progresso.
- [x] `PROGRESS_30_DAYS`.
- [x] `BEFORE_AFTER_READY`.

### Social

- [x] Primeira publicação.
- [x] Primeiro amigo.
- [x] Primeiro grupo.
- [x] Primeira reação recebida.
- [x] Primeiro comentário recebido.
- [x] Primeiro desafio ingressado.
- [x] Primeiro desafio concluído.

### Onboarding e alimentação

- [x] `WELCOME`.
- [x] `BETA_TESTER`.
- [x] `PROFILE_COMPLETE`.
- [x] `GOAL_DEFINED`.
- [x] `READY_TO_START`.
- [x] `FIRST_MEAL`.
- [x] `FULL_MEAL_DAY`.
- [x] `FIRST_BREAKFAST`.
- [x] `FIRST_LUNCH`.
- [x] `FIRST_DINNER`.
- [x] `MEALS_10`.
- [x] `MEALS_50`.
- [x] `MEALS_100`.

---

## 9. Comunidade — publicações e compartilhamento

### Atividades

- [x] `PostType.ACTIVITY`.
- [x] Compartilhamento manual.
- [x] Escolha entre não compartilhar, Comunidade geral ou grupo.
- [x] Card com tipo, ícone, duração, distância, data, intensidade, observação, XP, reações e comentários.
- [x] Nenhuma atividade é publicada automaticamente.

### Conquistas

- [x] `PostType.ACHIEVEMENT`.
- [x] CTA `Compartilhar conquista`.
- [x] Card visual de conquista.
- [x] Badge/ícone, data e descrição.
- [x] Publicação sempre depende de ação explícita do usuário.

### Streak

- [x] `PostType.STREAK`.
- [x] Compartilhamento de marco.
- [x] Card específico.
- [x] Reações e comentários.

### Antes & Depois / progresso

- [x] Botão `Compartilhar progresso`.
- [x] Escolha das informações exibidas.
- [x] Peso oculto por padrão.
- [x] Legenda opcional.
- [x] Compartilhamento em Comunidade geral ou grupo.
- [x] Nunca publica automaticamente.
- [x] `PostType.PROGRESS_SHARE`.
- [x] O post usa cópia do blob privado, sem referência viva à foto original.

### Refeições

- [x] Compartilhamento de uma refeição específica.
- [x] Snapshot de nome e macros.
- [x] Macros opcionais e ocultos por padrão.
- [x] Compartilhamento funciona para refeições favoritas ou não.
- [x] Reaproveita `PostType.PLAN_SHARE`.

### Compartilhamento externo

- [x] Link HTTPS fornecido pelo usuário.
- [x] Imagem fornecida pelo usuário.
- [x] Legenda.
- [x] Origem/provedor.
- [x] Badge de origem.
- [x] Sem scraping automático.
- [x] Origens previstas: Strava, Garmin, Apple Fitness, Samsung Health, Nike Run Club, Adidas Running e Outros.

---

## 10. Feed e preferências de conteúdo

- [x] Feed `Para Você`.
- [x] Feed de Amigos.
- [x] Feed heurístico.
- [x] Filtro `Alimentação`.
- [x] Silenciar tipos de conteúdo com persistência.
- [x] Ocultar publicações de um usuário sem bloquear.
- [x] Reativar usuário silenciado pela tela de Privacidade.

---

## 11. Grupos de amigos e desafios colaborativos

### Grupos

- [x] Feed exclusivo.
- [x] Ranking do grupo.
- [x] Desafios privados.
- [x] Convites.
- [x] Código/link de convite.
- [x] Convite direcionado a usuário específico.
- [x] Papéis `OWNER`, `ADMIN` e `MEMBER`.
- [x] Estatísticas do grupo.
- [x] Membros ativos na semana.
- [x] Atividades da semana.
- [x] Refeições concluídas na semana.

### Desafios

- [x] Métricas:
  - `ACTIVE_DAYS`
  - `ACTIVITY_COUNT`
  - `ACTIVITY_MINUTES`
  - `MEAL_COMPLETIONS`
  - `STREAK_DAYS`
  - `WALKING_DAYS`
  - `RUNNING_DAYS`
  - `CYCLING_DAYS`
  - `STRENGTH_DAYS`
  - `BALANCED_DAYS`
- [x] Desafios globais persistidos.
- [x] Desafios exclusivos de grupo.
- [x] Ranking interno.
- [x] Progresso individual.
- [x] Progresso coletivo.
- [x] Meta coletiva editorial opcional (`collectiveTarget`).
- [x] Target coletivo derivado automaticamente quando não informado.
- [x] XP de recompensa.
- [x] Notificação ao completar.
- [x] Celebração de conclusão.
- [x] Recompensa individual para os participantes elegíveis.

---

## 12. Ranking

- [x] Ranking principal baseado em XP.
- [x] Distância não é métrica principal.
- [x] Não favorece esporte específico.
- [x] Período semanal.
- [x] Período mensal.
- [x] Período geral.
- [x] Comunidade geral.
- [x] Amigos.
- [x] Grupo.
- [x] Usuários bloqueados são excluídos do escopo correspondente.

---

## 13. Privacidade

- [x] Tela central `/community/privacy`.
- [x] Toggles de privacidade social persistidos.
- [x] Gerenciamento de tipos de conteúdo silenciados.
- [x] Gerenciamento de usuários silenciados.
- [x] Dados privados não viram conteúdo social automaticamente.
- [x] Dados sincronizados de integrações permanecem separados de conteúdo social.
- [x] Atividade e progresso continuam privados por padrão.

---

## 14. Notificações

### Preferências

- [x] Categorias persistidas:
  - Social
  - Refeições
  - Atividades
  - Desafios
  - Sequência
  - Progresso
  - Lembretes

### Gatilhos implementados

- [x] Nova solicitação de amizade.
- [x] Amizade aceita.
- [x] Comentário recebido.
- [x] Reação recebida.
- [x] Convite para grupo.
- [x] Desafio de grupo iniciado.
- [x] Desafio concluído.
- [x] Conquista desbloqueada.
- [x] Meta semanal de atividade atingida.
- [x] `notifyIfEnabled` centraliza a criação respeitando preferências.

---

## 15. Moderação

- [x] Denunciar publicação.
- [x] Denunciar comentário.
- [x] Denunciar usuário.
- [x] Bloquear usuário.
- [x] Área de moderação administrativa.
- [x] Papéis `MODERATOR`/`ADMIN`.
- [x] Ocultar publicação.
- [x] Excluir comentário.
- [x] Histórico de denúncias.
- [x] Rate limiting para criação de posts.
- [x] Rate limiting para comentários.
- [x] Rate limiting para denúncias.

---

## 16. Connected Apps

- [x] Módulo `Connected Apps`.
- [x] Tela `/profile/connected-apps`.
- [x] Entidade `ConnectedApp`.
- [x] Provider.
- [x] Scopes.
- [x] Data de conexão.
- [x] Última sincronização.
- [x] Fluxo de desconexão implementado.
- [x] Tokens protegidos com AES-256-GCM.
- [x] Secrets mantidos apenas no ambiente do servidor.
- [x] Política por provedor centralizada.
- [x] Dados externos separados de `ActivityLog` social/gamificado.

---

## 17. Strava

- [x] OAuth 2.0 implementado.
- [x] Conexão validada com conta real.
- [x] Access token criptografado.
- [x] Refresh token criptografado.
- [x] Função de renovação automática implementada.
- [x] Busca de atividades autorizadas.
- [x] Normalização para modelo interno de integração.
- [x] Cache privado em `ExternalActivityCache`.
- [x] Deduplicação por provider/externalId.
- [x] Origem `STRAVA`.
- [x] Histórico unificado privado.
- [x] Lógica de sincronização incremental implementada.
- [x] Janela incremental coberta por teste automatizado.
- [x] Handlers de webhook implementados.
- [x] Webhook atualiza `ExternalActivityCache`, não `ActivityLog`.
- [x] Script administrativo de registro do webhook disponível.
- [x] Dados Strava não entram em XP, streak, desafios, ranking, metas ou insights sociais.

---

## 18. Beta, PremiumGrant e segurança de códigos

- [x] `BetaCode` e `PremiumGrant` persistidos.
- [x] Código puro nunca é salvo no banco.
- [x] `codeHash` único.
- [x] Um código pode ser resgatado por no máximo um usuário.
- [x] Um usuário pode usar no máximo um código Beta.
- [x] Claim atômico sob concorrência.
- [x] Retry do mesmo usuário é idempotente.
- [x] Usuário já Premium via Stripe não consome código Beta.
- [x] Código Beta não altera campos da assinatura Stripe.
- [x] Código opcional no onboarding.
- [x] Status Beta exibido sem revelar código/hash.
- [x] Gerador usa `crypto.randomBytes`.
- [x] Entropia ampliada para aproximadamente 138 bits.
- [x] Compatibilidade com códigos antigos preservada.
- [x] Arquivos de códigos gerados ignorados pelo Git.
- [x] Nenhum código Beta real hardcoded em arquivo rastreado.
- [x] Testes de concorrência com múltiplas requisições.
- [x] Testes com múltiplos usuários/códigos.
- [x] Resgate centralizado em `redeemBetaCodeForUser`.

---

## 19. Painel administrativo Beta/Premium

- [x] Área `/admin`.
- [x] Área `/admin/beta`.
- [x] Área `/admin/premium`.
- [x] Autorização server-side centralizada com `ProfileRole.ADMIN`.
- [x] Proteção no layout e novamente nas APIs administrativas.
- [x] Totais de códigos criados, disponíveis, usados, desativados e expirados.
- [x] Data de resgate e usuário associado.
- [x] Criação de lote.
- [x] Definição de duração e `redeemUntil`.
- [x] Desativação de código não utilizado.
- [x] Código puro exibido somente no retorno da geração e nunca recuperável depois.
- [x] Revogação administrativa de `PremiumGrant`.
- [x] Revogação Beta não cancela Stripe.
- [x] `AuditLog` reutilizado para auditoria administrativa.
- [x] Auditoria de lote criado.
- [x] Auditoria de código desativado.
- [x] Auditoria de grant revogado.
- [x] Metadata de auditoria nunca salva código Beta puro.
- [x] Status do `BetaCode` derivado, sem novo enum persistido.

---

## 20. Correção da foto de perfil Google × personalizada

- [x] Causa raiz corrigida no fluxo de persistência.
- [x] `SocialProfile.avatarUrl` separado em:
  - `customAvatarUrl`
  - `providerAvatarUrl`
- [x] Precedência centralizada: `customAvatarUrl ?? providerAvatarUrl ?? null`.
- [x] Foto do provedor vem das contas externas do Clerk, não de `user.imageUrl`.
- [x] Upload personalizado continua usando o storage/CDN do Clerk.
- [x] Remover foto personalizada restaura o avatar do provedor.
- [x] Validação aceita subdomínios confiáveis de `clerk.com`/`clerk.dev`.
- [x] Leitura de avatar unificada entre Perfil, header, feed, comentários, amizades, grupos, ranking e conquistas.
- [x] Componente de Avatar compartilhado.
- [x] Migration com backfill aplicada.
- [x] Nenhum bucket próprio foi criado para avatar.
- [x] Testes de precedência, sincronização, isolamento e persistência implementados.

---

## 21. QA e qualidade já executados

- [x] Testes automatizados de hidratação.
- [x] Testes automatizados do Beta.
- [x] Testes automatizados de avatar.
- [x] Testes automatizados do painel administrativo.
- [x] Teste da lógica incremental do Strava.
- [x] TypeScript validado sem erros nas rodadas registradas.
- [x] Build de produção concluído nas rodadas registradas.
- [x] Verificação de secrets do servidor sem exposição para o client.
- [x] Rotas privadas verificadas rejeitando acesso sem sessão.
- [x] Painel administrativo verificado ao vivo.
- [x] Persistência de preferências de privacidade verificada ao vivo.

---

# PARTE 2 — 🌐 DEMANDAS WEB / BACKEND — FAZER ANTES DO APK

> A versão Web/backend continua sendo a base canônica do SmartPlate.
>
> Tudo desta parte pode ser desenvolvido e validado **antes de iniciar o APK** e deve ser reutilizado depois pelo aplicativo mobile.
>
> Regra: se não depende de API nativa Android/iOS, push do sistema, widget ou execução em background do dispositivo, permanece nesta fase.

## 22. Streak e regras de consistência

- [ ] Fazer participação/conclusão de desafio qualificar o dia quando a regra de produto for definida.
  - Não implementado de propósito: a regra ainda não está definida nos documentos, e a task pede explicitamente para não inventar comportamento definitivo nesse caso.
  - Estrutura pronta pra receber isso quando a regra existir: `qualifyDayForStreak` (lib/community/gamification.ts) é o único ponto de entrada do motor de streak, reaproveitado por refeição e atividade — uma futura fonte "desafio" chamaria a mesma função, com o mesmo flag pattern, sem duplicar lógica.
  - Complicador real encontrado na auditoria: hoje um desafio pode completar de forma retroativa no momento do `join` (`computeInitialChallengeProgress`), quando o progresso inicial calculado no servidor já bate a meta — isso torna ambíguo "qual dia" deveria qualificar o streak. Fica registrado para quando a regra de produto for fechada.
- [x] Fazer registro de progresso (peso/foto) qualificar o dia — **decisão: não qualifica**. Peso/foto são eventos esporádicos, não hábito diário; forçá-los a qualificar um dia criaria incentivo a registrar peso todo dia, o que não é uma prática recomendável.
  - Corrigido um problema real de exploração encontrado durante a auditoria (independente da decisão acima): `WeightLog` não tem trava de unicidade por dia (`@@unique` é por timestamp exato) e `ProgressPhoto` não tem trava nenhuma — `WEIGHT_LOGS_10`/`WEIGHT_LOGS_25`/`BEFORE_AFTER_READY` contavam linhas brutas, então registrar várias vezes no mesmo dia local inflava esse progresso. Passaram a contar **dias locais distintos** (mesmo padrão já usado por `WATER_LOGS_DISTINCT_DAYS`). Coberto por testes novos.
- [x] Decidir se atingir a meta de hidratação deve qualificar o dia — **decisão: não qualifica**. A auditoria confirmou um gap real que reforça essa escolha: a avaliação de "meta batida" hoje sempre lê a meta ATUAL do perfil (`Profile.dailyWaterGoalMl`), não um snapshot da meta vigente naquele dia específico — não existe histórico de meta por dia. Ligar isso ao streak geral ampliaria o impacto desse gap (mudar a meta depois afetaria retroativamente o streak, não só uma conquista isolada de hidratação). Sem mudança de comportamento nesta task.
- [x] Substituir definitivamente as regras provisórias das conquistas `STREAK_*` pelo motor atual de streak.
  - `STREAK_3/7/14/30/60/100/365` (achievement-catalog.ts) saíram de `COMING_SOON` para `AVAILABLE`, resolvidas exclusivamente em `achievement-engine.ts` contra `UserGamification.longestStreak` (o recorde histórico do usuário — nunca revogado se o streak quebrar depois).
  - O motor antigo (`checkAndUnlockAchievements`/`getStreakAchievements` em `lib/community/achievements.ts` e `gamification.ts`) foi removido — não existe mais um segundo caminho de desbloqueio para `STREAK_*`. Fonte de verdade única: Streak Engine → Achievement Engine, nunca o contrário.
- [ ] Definir a conquista de rotina prolongada `Evolução` somente quando houver uma regra objetiva e não facilmente explorável.
  - Mantida sem implementação — não existe nem como entrada `COMING_SOON` no catálogo. Os documentos não definem uma regra objetiva/mensurável/resistente a abuso para ela; inventar uma agora violaria a instrução explícita da task. Pendência de decisão de produto.
- [x] Validar regras de dia/semana e timezone para todas as conquistas que passarem a depender dessas fronteiras.
  - `lib/community/dates.ts` continua a única fonte de verdade de timezone (nenhuma lógica de fronteira de dia duplicada foi encontrada ou introduzida). Testes novos cobrem: virada de meia-noite em fuso não-UTC, dois usuários em fusos opostos no mesmo instante UTC, e streak sobrevivendo corretamente a dia perdido/retroatividade.

---

## 23. Conquistas e XP

- [x] Auditar favoritos no Plano Semanal para decidir se `FIRST_FAVORITE` pode virar `AVAILABLE`.
  - Funcional e persistido de verdade (`MealPlan.favorite` e `Meal.is_favorite` dentro do JSON do `DayPlan`), por usuário, sobrevive a refresh — virou `AVAILABLE`. Resolvida por reconciliação (mesmo padrão de todas as outras conquistas incrementais, sem endpoint dedicado). Idempotente: favoritar/desfavoritar/favoritar de novo não gera XP extra (coberto por teste).
- [x] Auditar troca de refeição para decidir se `FIRST_MEAL_SWAP` pode virar `AVAILABLE`.
  - Troca é real e persistida (macros atualizam, sobrevive a reload) — virou `AVAILABLE`. Como a aplicação da troca usa a mesma rota `PATCH /api/meal-plans/[id]/meals` de uma edição manual comum, foi adicionado `swapped: true` ao payload enviado só pelo fluxo real de troca (`applySwapMutation`) — sinal mínimo e persistido no próprio `DayPlan`, sem criar uma tabela de histórico nova. Uma edição manual sem esse campo não desbloqueia a conquista (coberto por teste).
- [x] Criar modal enriquecido de nova conquista com ações `Ver conquista` e `Continuar`.
  - `components/achievements/AchievementUnlockModal.tsx` — ícone, raridade, XP, "Ver conquista" (navega para `/profile` e abre a conquista destacada) e "Continuar". Acessível (`role="dialog"`, `aria-modal`, ESC, foco preso, respeita `prefers-reduced-motion`).
- [x] Criar fila/resumo quando várias conquistas forem desbloqueadas juntas.
  - `components/achievements/AchievementUnlockProvider.tsx`, montado globalmente (não só no Perfil) — 1-3 desbloqueios em sequência (uma de cada vez), 4+ vira um resumo agrupado com XP total. Consolidou os dois mecanismos de toast descoordenados que existiam antes (`AchievementCelebration.celebrateAchievements` + efeito interno de `useAchievements.tsx`) numa única fila.
- [x] Criar layout dedicado para card de conquista compartilhada.
  - Reaproveitado o branch `ACHIEVEMENT` já existente em `PostCard.tsx` (sem duplicar a estrutura do feed) — acrescentado badge de raridade e "+XP", derivados no servidor (`POST /api/community/posts`) a partir do catálogo, nunca aceitos do cliente.
- [ ] Revisar valores de XP por raridade com base em uso real.
  - Estrutura validada e já centralizada (`ACHIEVEMENT_RARITY_XP` em achievement-catalog.ts — Common 10 / Uncommon 20 / Rare 40 / Epic 75 / Special 100); nenhum valor hardcoded divergente encontrado no frontend.
  - Rebalanceamento definitivo depende de telemetria de uso real do Beta — não alterado nesta task para não inventar números sem dado real.

---

## 24. Comunidade e compartilhamentos

- [x] Migrar compartilhamento de streak para o Composer unificado.
  - `STREAK` virou um `PostAttachment` real (`lib/community/post-draft.ts`). O botão "Compartilhar" do toast de marco de streak (`AchievementCelebration.tsx`) agora abre o Composer unificado em vez de publicar direto sem preview/legenda/destino — mesmo fluxo de qualquer outro tipo de conteúdo. `POST /api/community/posts` já validava `STREAK` corretamente contra `UserGamification.longestStreak`; não precisou mudar.
- [x] Criar posts reais de desafio/progresso antes de liberar filtro `Desafios/Progresso`.
  - `PROGRESS_SHARE` já era real (cópia do blob, ownership validado) — só faltava o filtro no feed, adicionado.
  - `CHALLENGE` era um tipo aceito no enum/schema mas sem nenhum jeito de criar um post de verdade. Implementado de ponta a ponta: `ChallengePickerModal` lista só desafios que o próprio usuário concluiu (novo `GET /api/community/challenges/completed`) → Composer → `POST /api/community/posts` revalida `ChallengeParticipant.completedAt` no banco antes de aceitar (nunca confia em título/progresso vindo do cliente) → card dedicado no feed com título/métrica/meta reais.
  - Filtros "Desafios" e "Progresso" adicionados em `PostFeedList.tsx`, filtrando por `post.type` real (nunca busca de texto).
- [ ] Implementar proteção anti-spam além do rate limiting, se o uso real mostrar necessidade.
  - Rate limiting auditado (10 posts/hora, 30 comentários/hora, 20 denúncias/hora) e continua a única camada. Nenhuma evidência de abuso real encontrada no projeto — não implementado por falta de necessidade comprovada, exatamente como a própria regra desta seção pede.
- [x] Compartilhar receita isoladamente com ingredientes.
  - Reaproveitado o attachment `MEAL_ITEM` já existente — uma refeição isolada já É o conceito de "receita" neste produto (não existe um catálogo de receitas separado das refeições geradas). Passou a incluir `ingredients`, sempre junto quando existirem (diferente das macros, que continuam opcionais via `showMacros`). Card do feed ganhou lista de ingredientes com "ver mais" quando a lista é longa.
- [ ] Validar em ambiente com Blob configurado o fluxo completo de cópia da foto de progresso para `PROGRESS_SHARE`.
  - Fluxo revisado de ponta a ponta (ownership validado antes de copiar, `copyPrivateImage` gera um blob novo e distinto, cleanup em falha de transação) e está correto — mas `BLOB_READ_WRITE_TOKEN` não está configurado neste ambiente, então a validação real (upload → cópia → visualização por outro usuário) não pôde ser executada. Pendência de infraestrutura, não de código.

---

## 25. Grupos

- [x] Definir regras de produto para metas coletivas de grupo.
  - Decisão: metas coletivas de grupo já existem via `Challenge.scope=GROUP` + `collectiveTarget`/`deriveCollectiveTarget` (meta editorial opcional ou derivada automaticamente), com progresso agregado sempre calculado no servidor. Isso já satisfaz "participação agregada, nunca dado privado exposto" — as métricas disponíveis (dias ativos, refeições concluídas, contagens de atividade) não são dados de saúde sensíveis.
  - Decisão explícita sobre exibição individual: o ranking de grupo e o ranking de desafio continuam mostrando XP/progresso por membro ao lado do agregado — mantido de propósito, não por descuido, porque nenhuma métrica hoje é sensível (peso/saúde nunca entram em métrica de desafio). Se uma métrica sensível existir no futuro, só o agregado deve aparecer.
  - Entrada tardia (não importa histórico anterior) e período (`startsAt`/`endsAt`) já são regras existentes de `Challenge`.
- [x] Definir regras de produto para conquistas de grupo.
  - Regra definida, implementação adiada de propósito: não existe hoje nenhum `GroupAchievement`, e criar schema novo sem um caso de uso real antecipa demais. A regra: conquista de grupo representa um marco coletivo verificável, pertence ao grupo (não a um usuário), é idempotente por grupo, e NÃO concede XP pessoal automático a cada membro (evita farming com grupos artificiais). Registrada como definição pronta para quando a implementação for priorizada.
- [x] Avaliar necessidade de moderação específica por grupo além da moderação central.
  - Avaliado: havia uma lacuna real — OWNER/ADMIN do grupo geriam membros, mas não tinham nenhuma autoridade sobre conteúdo (só um MODERATOR/ADMIN global podia ocultar um post, mesmo dentro do próprio grupo do OWNER). Corrigido: OWNER/ADMIN do grupo agora pode remover (soft delete) um post do próprio grupo — `canDeleteCommunityPost` (`lib/community/authz.ts`), exposto como "Remover do grupo" no menu do post. Moderação central segue intocada e é a única via pra denúncia/ocultação por violação; denunciar um post dentro de um grupo nunca foi bloqueado pela privacidade do grupo (confirmado na auditoria, sem mudança necessária).

---

## 26. Notificações internas

> Esta seção trata da **lógica persistida no backend/Web**. Push nativo fica na Parte 4.

- [x] Criar gatilhos reais para categorias que ainda possuem apenas preferência/toggle.
  - `notifyStreak` não tinha nenhum gatilho real — corrigido: desbloqueio de conquista `STREAK_*` agora usa a categoria correta (antes toda conquista, sem exceção, caía em `notifyProgress`, deixando `notifyStreak` sem efeito apesar de existir como toggle).
  - `notifyMeals` e `notifyReminders` continuam sem gatilho — ver os dois itens abaixo (dependem de decisão de produto e/ou dado/infraestrutura que não existe).
- [ ] Definir comportamento das notificações de Refeições.
  - Não implementado: não existe hoje um conceito confiável de horário de refeição persistido de forma utilizável para lembrete. Inventar um horário arbitrário violaria a instrução desta task. Pendência de decisão de produto + de dado.
- [ ] Definir comportamento das notificações de Lembretes.
  - Não implementado: "Lembretes" continua sem escopo definido além do nome/toggle. Lembretes configuráveis pelo usuário exigiriam infraestrutura de agendamento (cron/scheduler) que não existe no projeto hoje — confirmado: nenhum `vercel.json` de cron, nenhuma rota `/api/cron/*`, nenhuma lib de scheduler. Pendência de decisão de produto + infraestrutura.
- [x] Revisar cobertura de notificações de Desafios.
  - Corrigido um bug real: `CHALLENGE_COMPLETED` ia direto por `db.notification.create`, ignorando por completo a preferência `notifyChallenges` — quem desligava a categoria continuava recebendo a notificação de qualquer jeito. Agora passa por `notifyIfEnabled`, igual a `GROUP_CHALLENGE_STARTED`.
  - Gatilhos adicionais avaliados (convite pra desafio, progresso em 50%, "prestes a terminar") e conscientemente não implementados agora — "convite" não existe como conceito (desafios são públicos numa lista, não convite direto), e "prestes a terminar" exigiria o mesmo scheduler inexistente do item de Lembretes. Ficam como backlog, não forçados só pra fechar checkbox.
- [x] Revisar cobertura de notificações de Sequência.
  - Corrigido: marcos de streak (`STREAK_*`) agora notificam sob `notifyStreak` (antes caíam sob `notifyProgress`).
  - "Streak em risco" avaliado e conscientemente não implementado: exige um scheduler considerando o timezone de cada usuário, inexistente no projeto. Documentado como pendência de infraestrutura (Web/Pós-Mobile), não de código.
- [x] Manter toda notificação persistida no backend como fonte canônica, independentemente do futuro push.
  - Já era verdade para toda notificação existente. Reforçado: `Notification` ganhou um campo `link` (migration aditiva, nullable — nenhum dado existente afetado) com a rota relativa de destino, populado nos 8 gatilhos existentes. Antes, clicar em qualquer notificação levava genericamente pra `/community`; agora conquista leva pra `/profile?achievement=CODE` (reaproveitando o deep link já construído na consolidação de streak/conquistas), desafio de grupo leva pro grupo certo, etc.

---

## 27. Strava — QA e estabilização

- [ ] Observar renovação automática de token real após expiração.
- [ ] Exercitar desconexão com conta de teste, incluindo revogação e limpeza local.
- [ ] Executar segunda sincronização real e confirmar `after/lastSyncedAt`.
- [ ] Registrar e testar webhooks reais quando houver domínio de produção acessível ao Strava.

---

## 28. Beta e Premium — QA

- [ ] Validar com conta Clerk real: resgatar Beta → logout → login → confirmar persistência do acesso.
- [ ] Confirmar o fluxo em navegador real com sessão autenticada.

---

## 29. Foto de perfil — QA

- [ ] Validar ponta a ponta com conta Google real:
  1. entrar com Google;
  2. trocar a foto no SmartPlate;
  3. navegar por Perfil/Comunidade;
  4. recarregar;
  5. fazer logout/login;
  6. conferir posts, comentários, grupos e ranking;
  7. remover a foto personalizada;
  8. confirmar retorno à foto do Google.
- [ ] Avaliar webhook `user.updated` do Clerk somente se houver necessidade real de atualizar `providerAvatarUrl` imediatamente quando a foto for alterada fora do SmartPlate.

---

## 30. Painel administrativo

> O painel administrativo permanece Web. Não é necessário criar versão administrativa dentro do APK.

- [ ] Avaliar busca/filtros avançados por usuário, código e lote.
- [ ] Implementar grant administrativo manual com `source: "ADMIN"` se houver necessidade operacional.
- [ ] Avaliar RBAC administrativo mais granular quando surgirem novos papéis administrativos.

---

## 31. Garmin / novas integrações server-side

> Pode ser implementado antes do APK se a integração oficial escolhida funcionar via backend/Connected Apps.

- [ ] Avaliar API/programa oficial disponível no momento da implementação.
- [ ] Conectar conta.
- [ ] Importar atividades autorizadas.
- [ ] Normalizar dados na camada de integração existente.
- [ ] Respeitar políticas de compartilhamento.
- [ ] Evitar duplicidade com atividades vindas do Strava.
- [ ] Fazer Web e futuro mobile consumirem a mesma integração persistida no backend.

---

## 32. Deduplicação multi-integração

> Implementar quando existir uma segunda fonte real de atividades.

- [ ] Detectar `externalId`.
- [ ] Detectar atividades muito semelhantes entre provedores.
- [ ] Evitar XP duplicado.
- [ ] Permitir fonte preferencial.
- [ ] Preservar origem original quando possível.
- [ ] Centralizar a regra no backend.

---

## 33. IA + atividade física

- [ ] Gerar resumo semanal mais rico com IA.
- [ ] Identificar mudanças de rotina.
- [ ] Usar atividade como contexto de personalização do plano alimentar.
- [ ] Considerar dias mais ativos no plano.
- [ ] Sugerir organização de refeições em dias de treino.
- [ ] Evitar recomendações médicas indevidas.
- [ ] Não inferir gasto calórico exato sem fonte confiável.

---

## 34. Calendário / Timeline

- [ ] Criar visão diária unificada com:
  - refeições;
  - atividades;
  - hidratação;
  - peso;
  - fotos de progresso;
  - conquistas;
  - desafios.
- [ ] Estruturar os dados de forma reutilizável pelo futuro app mobile.

---

## 35. Métricas internas do produto

- [ ] Usuários ativos.
- [ ] Atividades registradas.
- [ ] Refeições concluídas.
- [ ] Taxa de adesão.
- [ ] Desafios concluídos.
- [ ] Posts por semana.
- [ ] Retenção.
- [ ] Streak médio.
- [ ] Uso de grupos.
- [ ] Uso de integrações.

---

## 36. Free x Premium

> Definir quando os módulos principais estiverem estáveis e com valor real comprovado, mas ainda dentro da fase Web/backend para que o mobile apenas consuma os mesmos gates.

- [ ] Limite de gerações do plano no Free.
- [ ] Limite de uso de IA.
- [ ] Limite de regenerações.
- [ ] Limites da lista de compras.
- [ ] Recursos de personalização por plano.
- [ ] Limites de histórico.
- [ ] Recursos Premium de comunidade/grupos.
- [ ] Integrações externas por plano.
- [ ] Relatórios e insights de IA.
- [ ] Antes & Depois como possível recurso Premium.
- [ ] Estratégia de upgrade.
- [ ] Trial.
- [ ] Grace period.
- [ ] Expiração/cancelamento.
- [ ] Downgrade.
- [ ] Comparativo visual Free x Premium.
- [ ] Garantir que downgrade/expiração não apague nem prejudique dados existentes.
- [ ] Não restringir recurso essencial de segurança.

---

## 37. Códigos promocionais

> Continuar sem generalizar `BetaCode` antes de existir necessidade real.

- [ ] Categorias futuras `BETA / PROMO / PARTNER / GIFT / ADMIN`, se necessárias.
- [ ] Campanhas promocionais.
- [ ] Quantidade máxima de usos.
- [ ] Datas de validade.
- [ ] Duração Premium por campanha.
- [ ] Códigos de parceiros.
- [ ] Gifts.
- [ ] Grants administrativos como fluxo de produto, caso necessário.
- [ ] Garantir que Web e Mobile consultem o mesmo acesso Premium centralizado.

---

## 38. Evoluções sociais e gamificação

> Podem nascer na Web e depois receber interface mobile reutilizando o mesmo backend.

- [ ] Medalhas sazonais.
- [ ] Eventos da comunidade.
- [ ] Desafios oficiais SmartPlate.
- [ ] Vitrine de conquistas no Perfil.
- [ ] Cards compartilháveis em redes sociais.
- [ ] Resumo semanal/mensal visual.
- [ ] Comparação do usuário consigo mesmo.
- [ ] Calendário de consistência estilo GitHub.
- [ ] Heatmap de atividades/refeições.
- [ ] Metas personalizadas mais elaboradas.
- [ ] Sistema de níveis mais rico.
- [ ] Títulos de perfil desbloqueáveis.
- [ ] Recompensas cosméticas.
- [ ] Badges de eventos.
- [ ] Reações especiais.
- [ ] Comentários com mídia.
- [ ] Favoritos sociais.
- [ ] Sugestões de amigos.
- [ ] Convite social por link.

---

# PARTE 3 — 📱 DEMANDAS MOBILE — DURANTE A CONSTRUÇÃO DO APK

> Esta parte só começa quando a base Web estiver suficientemente estável e a versão Android/APK entrar em desenvolvimento.
>
> O APK deve reutilizar as APIs, banco, autenticação, Premium, XP, conquistas, comunidade, hidratação e demais regras já existentes. Não criar regras de negócio paralelas dentro do aplicativo.

## 39. Estrutura base do aplicativo Android

- [ ] Criar/adaptar a experiência mobile consumindo as APIs existentes.
- [ ] Definir navegação principal do aplicativo.
- [ ] Adaptar layouts, modais e formulários para tela pequena.
- [ ] Tratar teclado virtual corretamente.
- [ ] Tratar safe areas.
- [ ] Tratar permissões nativas.
- [ ] Garantir persistência e recuperação de sessão.
- [ ] Garantir que nenhuma regra de negócio importante exista somente dentro do APK.

---

## 40. Validação dos fluxos existentes em Android real

- [ ] Validar login e onboarding.
- [ ] Validar Início/Dashboard.
- [ ] Validar Plano Semanal.
- [ ] Validar Lista de Compras.
- [ ] Validar Hidratação.
- [ ] Validar registro e histórico de atividades.
- [ ] Validar Comunidade.
- [ ] Validar posts, reações e comentários.
- [ ] Validar grupos.
- [ ] Validar desafios.
- [ ] Validar ranking.
- [ ] Validar conquistas.
- [ ] Validar Perfil.
- [ ] Validar foto de perfil/avatar.
- [ ] Validar uploads de imagens.
- [ ] Validar progresso e Antes & Depois.
- [ ] Validar gates Free/Premium/Beta usando o mesmo backend.
- [ ] Validar logout/login.
- [ ] Validar telas críticas em dispositivos Android reais com tamanhos diferentes.

---

## 41. Experiência específica do mobile

- [ ] Criar resumo de atividade otimizado para mobile.
- [ ] Adaptar cards e dashboards para uso por toque.
- [ ] Adaptar Composer e fluxos sociais.
- [ ] Adaptar histórico de hidratação/atividade/progresso.
- [ ] Preparar roteamento interno para receber Deep Links posteriormente.
- [ ] Preparar pontos de navegação que possam ser abertos por notificações futuramente.

---

## 42. Health Connect — Android

- [ ] Validar documentação e API oficial vigente no momento da implementação.
- [ ] Solicitar apenas as permissões necessárias.
- [ ] Ler dados autorizados compatíveis, como passos, exercícios, distância e duração.
- [ ] Definir quais dados realmente fazem sentido no SmartPlate.
- [ ] Permitir revogar permissões.
- [ ] Mostrar fonte dos dados.
- [ ] Normalizar os dados pela mesma camada de integração/backend.
- [ ] Manter dados sincronizados privados por padrão.
- [ ] Não publicar automaticamente dados vindos do Health Connect.
- [ ] Evitar duplicidade com Strava/Garmin e outras fontes.

---

## 43. Preparação para recursos nativos posteriores

> Nesta etapa apenas preparar a arquitetura. A implementação completa fica na Parte 4.

- [ ] Preparar identificação do dispositivo para futuro Push Notification.
- [ ] Preparar rotas/telas que poderão ser abertas via Deep Link.
- [ ] Identificar quais sincronizações realmente precisam rodar em background.
- [ ] Definir quais dados poderiam ser úteis em Widget Android.
- [ ] Não bloquear o lançamento do APK base por causa desses recursos.

---

# PARTE 4 — 🚀 PÓS-MOBILE — DEPOIS QUE O APK BASE ESTIVER FUNCIONAL

> Recursos que **não devem bloquear a primeira versão funcional do APK**.
>
> Só iniciar depois que os fluxos principais do aplicativo Android estiverem funcionando corretamente em dispositivos reais.

## 44. Deep Links completos

- [ ] Configurar Deep Links do SmartPlate.
- [ ] Abrir posts específicos.
- [ ] Abrir grupos.
- [ ] Abrir desafios.
- [ ] Abrir convites.
- [ ] Abrir Perfil quando aplicável.
- [ ] Abrir telas corretas a partir de notificações.
- [ ] Tratar usuário não autenticado e redirecionar corretamente após login.

---

## 45. Push Notifications nativas

- [ ] Registrar e gerenciar dispositivos no backend.
- [ ] Associar push às notificações persistidas já existentes.
- [ ] Não criar um sistema paralelo de eventos exclusivo do mobile.
- [ ] Push de solicitação de amizade.
- [ ] Push de amizade aceita.
- [ ] Push de comentário/reação.
- [ ] Push de convite para grupo.
- [ ] Push de desafio.
- [ ] Push de conquista.
- [ ] Push de meta atingida.
- [ ] Avaliar push de hidratação.
- [ ] Implementar `streak em risco` quando houver infraestrutura proativa adequada.
- [ ] Respeitar preferências de notificação do usuário.

---

## 46. Sincronização em background

- [ ] Definir quais integrações realmente precisam atualizar com o app fechado.
- [ ] Sincronizar somente dados necessários.
- [ ] Respeitar bateria, rede e limites do sistema operacional.
- [ ] Evitar chamadas duplicadas.
- [ ] Evitar duplicidade de atividades.
- [ ] Reutilizar regras de deduplicação do backend.
- [ ] Não depender de background sync para funcionalidades essenciais do app.

---

## 47. Widgets Android

- [ ] Definir primeiro conjunto de widgets.
- [ ] Avaliar widget de hidratação.
- [ ] Avaliar widget de streak.
- [ ] Avaliar widget de próxima refeição.
- [ ] Avaliar widget de resumo diário.
- [ ] Avaliar widget de atividade da semana.
- [ ] Permitir ações rápidas somente quando forem seguras e consistentes com o backend.

---

## 48. iOS — versão futura

> Iniciar somente quando houver decisão de criar uma versão iOS. Não faz parte do APK Android inicial.

### Base iOS

- [ ] Adaptar a mesma base do produto para iOS.
- [ ] Reutilizar as mesmas APIs.
- [ ] Reutilizar autenticação, banco e regras de negócio.
- [ ] Validar telas e fluxos críticos em iPhone real.
- [ ] Validar permissões e comportamentos específicos do iOS.

### HealthKit

- [ ] Integrar Apple Health / HealthKit.
- [ ] Solicitar permissões individualmente.
- [ ] Importar apenas dados autorizados.
- [ ] Normalizar no mesmo domínio de atividades.
- [ ] Evitar arquitetura paralela ao Android/Web.
- [ ] Aplicar deduplicação com outras integrações.

### Recursos iOS posteriores

- [ ] Implementar Deep Links equivalentes.
- [ ] Implementar Push Notifications no iOS.
- [ ] Implementar sincronização em background quando necessário.
- [ ] Implementar Widgets iOS somente depois da versão iOS base estar estável.

---

# PARTE 5 — REGRAS PERMANENTES DO PROJETO

- **Web/backend é a base canônica do SmartPlate.**
- Funcionalidades que não dependem de recurso nativo devem nascer primeiro na base compartilhada.
- O APK e o futuro app iOS devem consumir as mesmas APIs, banco e regras de negócio.
- Não criar lógica paralela de XP, Premium, conquistas, comunidade, hidratação, desafios, privacidade ou permissões no mobile.
- Health Connect, HealthKit, push nativo, widgets e execução em background são responsabilidades da camada mobile.
- O painel administrativo permanece Web.
- Dados privados nunca devem virar conteúdo social automaticamente.
- Compartilhamento deve depender de ação explícita do usuário.
- Não criar métricas falsas, mocks ou controles que não persistem.
- O backend é a autoridade para XP, conquistas, Premium e permissões.
- `SocialProfile` deve conter apenas identidade pública e preferências sociais.
- Peso, saúde, progresso, fotos e objetivos permanecem privados por padrão.
- XP deve recompensar consistência, não comportamento extremo.
- Retry não pode criar duplicidade de XP, resgates, conquistas ou eventos.
- Integrações externas devem respeitar as políticas de cada provedor.
- Dados sincronizados e dados compartilhados são conceitos separados.
- Não copiar automaticamente dados externos para `ActivityLog` social/gamificado.
- Construir componentes e serviços reutilizáveis, evitando fluxos duplicados.
- Toda funcionalidade nova deve ter validação backend.
- Toda alteração de recurso privado deve verificar ownership.
- Secrets nunca devem ser expostos ao client.
- Código Beta puro nunca deve ser persistido ou recuperável depois da geração.
- Mudanças administrativas sensíveis devem gerar auditoria.
- Antes de considerar uma feature concluída, validar:
  - persistência real;
  - loading, erro e estado vazio;
  - autorização;
  - idempotência;
  - logout/login quando aplicável;
  - build;
  - ausência de regressão em Comunidade, Stripe e privacidade.

---

# ORDEM MACRO DE EXECUÇÃO

## 1. WEB — concluir antes de iniciar o APK

1. [ ] Fechar QA manual de Beta e foto de perfil.
2. [ ] Fechar QA restante do Strava.
3. [ ] Fechar streak/conquistas ainda provisórias.
4. [ ] Finalizar refinamentos prioritários de Comunidade.
5. [ ] Definir notificações internas restantes.
6. [ ] Definir decisões pendentes de grupos.
7. [ ] Implementar evoluções Web priorizadas: IA, Timeline, métricas etc.
8. [ ] Definir Free x Premium quando o produto estiver estável.
9. [ ] Evoluir códigos promocionais somente quando necessário.

## 2. MOBILE — construção do APK

10. [ ] Criar/adaptar a aplicação Android sobre a base existente.
11. [ ] Validar todos os fluxos críticos em dispositivo real.
12. [ ] Adaptar UX/navegação para mobile.
13. [ ] Integrar Health Connect se fizer parte do primeiro escopo Android.
14. [ ] Preparar estrutura para Deep Links, push e background sync.
15. [ ] Gerar e estabilizar o APK base.

## 3. PÓS-MOBILE

16. [ ] Implementar Deep Links completos.
17. [ ] Implementar Push Notifications.
18. [ ] Implementar sincronização em background onde houver necessidade.
19. [ ] Implementar Widgets Android.
20. [ ] Iniciar iOS quando houver decisão de produto.
21. [ ] Implementar HealthKit e demais recursos específicos do iOS.
