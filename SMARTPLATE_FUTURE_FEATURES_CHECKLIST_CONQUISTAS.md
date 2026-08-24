# SmartPlate AI — Checklist de Funcionalidades Futuras

> Backlog de ideias e funcionalidades para evolução do SmartPlate AI após a conclusão dos módulos principais.
>
> Objetivo: transformar o SmartPlate em uma plataforma de alimentação, progresso, atividade física, gamificação e comunidade, preparada para integrações externas.

---

## Legenda

- [ ] Não iniciado
- [x] Concluído
- **P0** — essencial / base
- **P1** — alta prioridade
- **P2** — evolução
- **P3** — futuro / experimental

## Como este arquivo está organizado

Reorganizado em três partes, pra separar claramente o que já existe do que é próximo passo real e do que é ideia de backlog sem data:

- **PARTE 1 — ✅ Já implementado**: seções com funcionalidade real, persistida, testada ou verificada diretamente no código nesta revisão. Detalhes e exceções pontuais continuam marcados `[ ]` dentro de cada seção — "já implementado" descreve a seção como um todo, não que 100% de cada checkbox interno esteja marcado.
- **PARTE 2 — 🔜 Ainda vai ser trabalhado**: itens com escopo concreto, já identificados como próximo passo, que dependem só de execução (não de uma decisão de produto ainda em aberto).
- **PARTE 3 — ⏸️ Pendente para depois**: ideias de backlog, evoluções de longo prazo, ou itens onde o próprio texto original já dizia "futuro"/"não definir ainda"/"evolução futura" — sem compromisso de quando.

Esta reorganização corrigiu algumas seções que estavam desatualizadas (marcadas como backlog futuro mas cuja funcionalidade já existe de verdade no código — conquistas/streak compartilháveis, moderação, grupos, progresso coletivo de desafios). Onde isso aconteceu, há uma nota explícita "(corrigido nesta reorganização)".

---

# PARTE 1 — ✅ Já implementado

# 1. Atividades físicas

## P0 — Estrutura base

- [x] Criar entidade `ActivityLog`
- [x] Relacionar `ActivityLog` ao usuário/Profile
- [x] Permitir registrar atividade manualmente
- [x] Salvar data/hora da atividade
- [x] Salvar tipo da atividade
- [x] Salvar duração
- [x] Salvar intensidade
- [x] Salvar observação opcional
- [x] Permitir distância opcional
- [x] Criar histórico de atividades
- [x] Permitir editar atividade
- [x] Permitir excluir atividade
- [x] Criar validação backend com Zod
- [x] Garantir que atividades sejam privadas por padrão

## Tipos iniciais de atividade

- [x] Caminhada
- [x] Corrida
- [x] Ciclismo
- [x] Musculação
- [x] Natação
- [x] Futebol
- [x] Esportes
- [x] Yoga
- [x] Mobilidade
- [x] HIIT
- [x] Outra atividade personalizada

## Campos sugeridos

```prisma
model ActivityLog {
  id           String   @id @default(uuid())
  userId       String
  profile      Profile  @relation(fields: [userId], references: [userId], onDelete: Cascade)

  activityType String
  durationMin  Int?
  distanceKm   Float?
  intensity    String?
  notes        String?

  source       String   @default("MANUAL")
  externalId   String?

  performedAt  DateTime
  createdAt    DateTime @default(now())

  @@index([userId, performedAt])
}
```

---

# 2. Registrar atividade em diferentes áreas do app

Criar um único componente reutilizável de registro de atividade.

## Início

- [x] Adicionar ação rápida `Registrar atividade`
- [x] Mostrar resumo de atividade recente
- [x] Mostrar minutos ativos da semana
- [x] Mostrar quantidade de atividades no período

## Comunidade

- [x] Adicionar opção `Registrar atividade`
- [x] Permitir registrar e decidir se deseja compartilhar
- [x] Permitir compartilhar uma atividade registrada anteriormente

## Perfil

- [x] Mostrar resumo de atividades
- [x] Exibir quantidade de atividades no mês
- [x] Exibir minutos ativos
- [x] Adicionar acesso ao histórico
- [x] Mostrar evolução de consistência

---

# 3. Atividades na Comunidade

## Novo tipo de publicação

- [x] Adicionar `ACTIVITY` em `PostType`

Exemplo:

```prisma
enum PostType {
  TEXT
  ACHIEVEMENT
  STREAK
  CHALLENGE
  PLAN_SHARE
  ACTIVITY
}
```

## Compartilhamento

- [x] Compartilhar atividade manualmente
- [x] Nunca publicar automaticamente
- [x] Permitir escolher destino

Opções:

- [x] Não compartilhar
- [x] Comunidade geral
- [x] Grupo específico

## Card de atividade

Exibir:

- [x] Tipo
- [x] Ícone
- [x] Duração
- [x] Distância, quando existir
- [x] Data
- [x] Intensidade
- [x] Observação
- [x] XP recebido
- [x] Reações
- [x] Comentários

Exemplo:

```text
🏃 Lucas concluiu uma corrida

Corrida • 35 min • 5,2 km
Intensidade moderada

"Corrida de domingo"

🔥 +20 XP

❤️ 12   💬 4
```

---

# 4. XP por atividade física

## Regras

- [x] Criar eventos de XP para atividades
- [x] Usar `XpEvent`
- [x] Criar `idempotencyKey` para impedir XP duplicado
- [x] Definir limite diário
- [x] Não recompensar excessivamente volume/performance

## Possível regra inicial

- [x] Registrar atividade válida: +10 XP
- [x] Atividade com 30+ minutos: +5 XP
- [x] Primeira atividade do dia: +5 XP
- [x] Concluir desafio: XP bônus — real via `recordChallengeCompletion` (motor de desafios)
- [ ] Conquista: XP bônus — na prática **já existe** via `unlockAchievement`/`ACHIEVEMENT_RARITY_XP` (ver seção 57); este item específico "atividade gerar bônus extra ao desbloquear uma conquista de atividade" continua não sendo um bônus adicional separado — o XP da conquista em si já é concedido normalmente.

## Anti-abuso

- [x] Máximo de XP diário por atividade
- [x] Duração mínima para receber XP
- [x] Impedir editar atividade repetidamente para ganhar XP
- [x] Remover/reverter XP quando necessário — decisão: XP nunca é revertido (`XpEvent` é ledger imutável); o teto diário de `activityXpEarned` nunca é decrementado, o que já impede o abuso criar→excluir→criar
- [x] Impedir atividades duplicadas vindas de integrações externas — `@@unique([source, externalId])` pronto

---

# 5. Streak / sequência

Expandir o conceito de sequência do SmartPlate.

## Ações que podem qualificar um dia

- [x] Completar refeição
- [x] Registrar atividade física
- [ ] Participar de desafio — desafios ainda não disparam `qualifyDayForStreak`
- [ ] Registrar progresso — peso/foto ainda não disparam `qualifyDayForStreak`
- [ ] Outras ações relevantes no futuro (ex.: hidratação, quando existir)

## Regras

- [x] Não exigir exercício todos os dias
- [x] Representar consistência geral no SmartPlate
- [x] Integrar com `DailyActivity`
- [x] Garantir timezone correto
- [x] Evitar dupla contagem de ações

---

# 6. Conquistas

## Atividade física

- [x] Primeiros Passos — primeira atividade (`FIRST_ACTIVITY`)
- [x] Em Movimento — 10 atividades (`ACTIVITIES_10`)
- [x] 50 Atividades (`ACTIVITIES_50`)
- [x] 100 Atividades (`ACTIVITIES_100`)
- [x] Semana Ativa — atividade em 3 dias da semana (`ACTIVE_3_DAYS_WEEK`)
- [x] Consistência — atividade em várias semanas diferentes (`ACTIVITY_WEEKS_CONSISTENCY`)
- [x] 30 Dias em Movimento (`ACTIVE_30_DAYS_TOTAL`)
- [x] Explorador — registrar diferentes tipos de atividade (`ACTIVITY_EXPLORER`)

## Alimentação + atividade

- [x] Rotina Completa — refeição + atividade no mesmo dia (`COMPLETE_ROUTINE`)
- [x] Semana Equilibrada — alimentação + atividade em 5 dias (`BALANCED_ROUTINE_WEEK`)
- [x] Consistência Total (`CONSISTENT_ROUTINE`)
- [ ] Evolução — manter rotina por determinado período — regra não definida por ser vaga demais para uma heurística segura/não-gameável; deixada de fora conscientemente

## Progresso

- [x] Primeira foto de progresso (`FIRST_PROGRESS_PHOTO`)
- [x] Primeiro registro de peso (`FIRST_WEIGHT_LOG`)
- [x] 10 registros de peso (`WEIGHT_LOGS_10`)
- [x] Primeira meta atingida (`PERSONAL_GOAL_REACHED`) — **corrigido nesta reorganização**: sistema real de metas semanais (`ActivityGoal`) foi implementado; conquista virou `AVAILABLE`, deixou de ser `COMING_SOON`
- [x] Sequência de registros de progresso (`PROGRESS_WEEKS_CONSISTENCY`)

## Social

- [x] Primeira publicação (`FIRST_POST`)
- [x] Primeiro amigo (`FIRST_FRIEND`)
- [x] Entrar em primeiro grupo (`FIRST_GROUP`)
- [x] Participar de primeiro desafio (`FIRST_CHALLENGE_JOINED`)
- [x] Concluir primeiro desafio (`FIRST_CHALLENGE_COMPLETED`)

### Status da implementação de atividades físicas

Data: 2026-08-23

Principais entregas: `ActivityLog` persistente e privado por padrão; CRUD completo com Zod centralizado; componente único de registro reutilizado em Início/Perfil/Comunidade; histórico real; resumo real no Início e Perfil; `PostType.ACTIVITY` real com snapshot seguro; XP idempotente com teto diário; integração com `DailyActivity`/streak via helper único `qualifyDayForStreak`; 15+ conquistas de atividade/rotina, com reconciliação retroativa automática.

Pendências reais (ver Parte 2/3): desafio/registro de progresso ainda não qualificam dia pra streak; regra "Evolução" (conquista) não definida por ser vaga; limite diário de XP tem uma janela de corrida rara sob dupla submissão verdadeiramente concorrente (documentado no código, não bloqueante).

---

> **Status desta rodada (seções 7-12):** Desafios (novas métricas + grupo) e
> Ranking (períodos/escopos) implementados, testados end-to-end contra o banco
> real. Connected Apps (arquitetura + criptografia + tela) e Compartilhamento
> externo genérico implementados e testados estruturalmente. Integração
> Strava: toda a arquitetura (OAuth, refresh, sync, webhook, disconnect) está
> implementada e revisada contra a documentação oficial, **e uma conta Strava
> real chegou a ser conectada e sincronizada** (ver seção 11) — mas renovação
> automática de token, desconexão e webhooks ao vivo ainda não foram
> exercitados de ponta a ponta (ver Parte 2).

# 7. Desafios

## Novas métricas

```text
ACTIVE_DAYS
ACTIVITY_COUNT
ACTIVITY_MINUTES
MEAL_COMPLETIONS
STREAK_DAYS
WALKING_DAYS
RUNNING_DAYS
CYCLING_DAYS
STRENGTH_DAYS
BALANCED_DAYS
```

## Exemplos

- [x] Atividade em 4 dias durante a semana
- [x] 150 minutos ativos
- [x] 300 minutos ativos
- [x] Complete 10 atividades
- [x] Complete 20 refeições planejadas
- [x] Mantenha sequência por 7 dias
- [x] Alimentação + atividade em 5 dias

> Os 7 desafios acima foram realmente criados no banco (`npm run challenges:seed`,
> idempotente) como `Challenge.scope = GLOBAL`, confirmado consultando o banco.

## Grupos

- [x] Permitir desafios exclusivos de grupos
- [x] Ranking interno (`GET /api/community/challenges/[id]/ranking`, critério progresso → percentual → tempo de conclusão como desempate)
- [x] Progresso individual
- [x] Progresso coletivo (campo `collective`, soma do progresso de cada participante sem reprocessar o mesmo evento)
- [x] XP de recompensa (via `XpEvent`, nunca `totalXp +=`)
- [x] Notificação ao completar (model `Notification` + `NotificationsBell` real)

---

# 8. Ranking

## Ranking principal

- [x] Continuar baseado em XP
- [x] Não usar distância como ranking principal
- [x] Não favorecer um tipo específico de esporte

Fontes de XP:

- [x] Alimentação
- [x] Atividade
- [x] Sequência (XP de marco de streak — 7/14/30/60/100 dias, uma vez por marco)
- [x] Conquistas (XP por raridade no desbloqueio — `achievement-engine.ts`)
- [x] Desafios

> `getXpBreakdown()` expõe a soma por fonte via `GET /api/community/gamification`
> (`xpBreakdown`). Ainda sem um gráfico dedicado no frontend para essa quebra
> (fica exposta na API, não visualizada) — ver Parte 3.

## Períodos

- [x] Semanal
- [x] Mensal
- [x] Geral

## Escopo

- [x] Comunidade geral (exclui usuários bloqueados em qualquer direção)
- [x] Amigos
- [x] Grupo

---

# 9. Connected Apps / Aplicativos conectados

## P1 — Base

- [x] Criar módulo `Connected Apps`
- [x] Criar tela de integrações (`/profile/connected-apps`, acessível pelo Perfil)
- [x] Criar entidade `ConnectedApp`
- [x] Armazenar provider
- [x] Armazenar scopes
- [x] Salvar data de conexão
- [x] Salvar última sincronização
- [x] Permitir desconectar integração
- [x] Proteger tokens (AES-256-GCM, `TOKEN_ENCRYPTION_KEY` só em env)
- [x] Nunca salvar token sensível sem proteção

---

# 10. Fontes externas de ActivityLog

- [x] Impedir duplicidade com `externalId` (`ActivityLog` mantém `@@unique([source, externalId])`; `ExternalActivityCache` usa `@@unique([userId, provider, externalId])`)
- [x] Identificar origem no histórico privado (badge de origem no histórico de atividades)
- [x] Não assumir que todas as fontes podem ser compartilhadas socialmente (`allowSocialSharing: false` para todo provider externo)
- [x] Tratar política de cada provedor separadamente (`lib/integrations/provider-policy.ts`)

> `ActivityLog.source` migrou de `String` para o enum `ActivitySource`. Nesta
> implementação **nenhum dado de provider externo é gravado em `ActivityLog`**
> — só `MANUAL`. Atividades do Strava vivem exclusivamente em
> `ExternalActivityCache` (privado, expira em 7 dias), nunca entram em
> XP/streak/desafio/ranking/metas/insights.

---

# 11. Integração Strava

**Atualização:** o usuário conectou uma conta Strava real e o fluxo completo
rodou de ponta a ponta — confirmado no banco: `ConnectedApp` com
`status = CONNECTED` e uma linha real em `ExternalActivityCache`. Isso valida
genuinamente OAuth, troca de código por token, criptografia de armazenamento,
sincronização e normalização.

## Conta

- [x] Conectar Strava via OAuth 2.0 — **validado** com conta real
- [x] Gerenciar access token — criptografado (AES-256-GCM), round-trip testado
- [x] Gerenciar refresh token — mesma criptografia
- [ ] Renovar tokens automaticamente — `ensureFreshStravaAccessToken` implementada, mas ainda não observada acontecendo de verdade (token atual não expirou durante os testes) — ver Parte 2
- [ ] Permitir desconectar Strava — rota implementada e revisada, mas não exercitada para não desconectar a conexão real do usuário sem pedir — ver Parte 2

## Sincronização privada

- [x] Buscar atividades autorizadas — **validado** com atividade real
- [x] Converter atividade para modelo interno — confirmado com dado real
- [x] Evitar duplicidades — `upsert` por `[userId, provider, externalId]`
- [x] Registrar origem `STRAVA`
- [x] Mostrar no histórico privado do usuário (histórico unificado Todas/SmartPlate/Strava)
- [ ] Implementar sincronização incremental — lógica via `lastSyncedAt` implementada; segunda sincronização real ainda não ocorreu para confirmar — ver Parte 2

## Webhooks

- [ ] Receber nova atividade/alteração/exclusão — handlers implementados e revisados contra o protocolo oficial, não testados contra webhooks reais do Strava — ver Parte 2
- [ ] Atualizar ActivityLog correspondente — **decisão de design, não pendência**: por política de privacidade, o webhook nunca escreve em `ActivityLog`, só em `ExternalActivityCache`

Script administrativo pronto: `npm run strava:webhook -- create <callbackUrl>`.

## Privacidade

- [x] Revisar políticas atuais da API antes da implementação
- [x] Não expor dados externos a terceiros sem permissão/política compatível
- [x] Separar dados privados sincronizados de conteúdo social

---

# 12. Compartilhamento externo genérico

## `Compartilhar de outro app`

- [x] Permitir link fornecido pelo usuário (validado https-only)
- [x] Permitir imagem fornecida pelo usuário (Vercel Blob privado, ownership checada)
- [x] Permitir legenda
- [x] Salvar origem/provedor
- [x] Mostrar badge da origem
- [x] Nunca buscar e redistribuir automaticamente dados proibidos pela API externa (sem scraping)

Origens: Strava, Garmin, Apple Fitness, Samsung Health, Nike Run Club, Adidas Running, Outros — todas `[x]`.

---

# 17. Dashboard de atividade

## Perfil

- [x] Atividades do mês
- [x] Minutos ativos
- [x] Dias ativos
- [x] Tipo mais praticado
- [x] Sequência de atividade
- [x] Histórico

## Início

- [x] Resumo semanal
- [x] Meta semanal
- [x] Atividade mais recente
- [x] CTA de registrar atividade

---

# 18. Metas de atividade

- [x] Dias ativos por semana
- [x] Minutos ativos por semana
- [x] Quantidade de atividades
- [x] Meta customizável
- [x] Progresso da meta
- [x] Conquista ao atingir
- [x] Não transformar meta em obrigação para manter streak geral

---

# 19. Insights privados

- [x] Detectar semana mais ativa
- [x] Detectar consistência
- [x] Resumo semanal
- [x] Evolução mensal
- [x] Relacionar atividade e alimentação de forma não invasiva
- [x] Criar insights privados com IA

---

# 24. Conquistas compartilháveis

**Corrigido nesta reorganização** — esta seção estava classificada como backlog, mas já está implementada:

- [x] CTA `Compartilhar conquista` (toast de `AchievementCelebration.tsx`, abre o Composer com a conquista pré-selecionada)
- [x] `PostType.ACHIEVEMENT` real
- [x] Card visual específico (`PostCard.tsx`, branch `ACHIEVEMENT`)
- [x] Mostrar badge/ícone
- [x] Mostrar data
- [x] Mostrar descrição
- [x] Não publicar automaticamente sem consentimento (sempre passa pelo Composer, usuário clica Publicar)

---

# 25. Streak compartilhável

**Corrigido nesta reorganização** — também já implementada, com uma ressalva:

- [x] Compartilhar marco de streak (`PostType.STREAK`, toast de milestone com botão Compartilhar)
- [x] Card especial de milestone (`PostCard.tsx`, branch `STREAK`)
- [x] Reações
- [x] Comentários
- [ ] **Ressalva**: o botão de compartilhar streak ainda publica direto (não passa pelo Composer unificado) — é uma exceção documentada, já que streak não fazia parte do escopo de unificação do Composer numa tarefa anterior. Migrar pra `openPostComposer` fica pra Parte 2 se for prioridade.

---

# 26. Grupos de amigos

**Corrigido nesta reorganização** — majoritariamente já implementado:

- [x] Feed exclusivo do grupo
- [x] Ranking do grupo
- [x] Desafios privados de grupo
- [x] Convites
- [x] Código/link de convite
- [x] Permissões `OWNER` / `ADMIN` / `MEMBER`
- [ ] Metas coletivas — só existem metas individuais (`ActivityGoal`), não metas de grupo
- [ ] Conquistas do grupo — só existem conquistas individuais
- [ ] Estatísticas do grupo — só contagem de membros; sem painel de estatísticas dedicado
- [ ] Moderação específica de grupo — moderação hoje é central (Comunidade geral), sem ferramentas extras por grupo

---

# 27. Desafios colaborativos

**Corrigido nesta reorganização** — o núcleo já existe via desafios de grupo (seção 7):

- [x] Barra de progresso do grupo (`collective`: soma do progresso de cada participante)
- [x] Recompensa para todos os participantes (cada um recebe XP ao completar, via `recordChallengeCompletion`)
- [x] Celebração automática quando concluído (`Notification` real)
- [ ] Meta coletiva "editorial" (ex.: uma meta única definida como soma-do-grupo desde a criação, distinta de "cada um bate sua própria meta") — hoje o `collective` é sempre a soma dos progressos individuais, não um modo de meta diferente

---

# 32. Moderação

**Corrigido nesta reorganização** — o núcleo já existe:

- [x] Denunciar publicação
- [x] Denunciar comentário
- [x] Denunciar usuário
- [x] Bloquear usuário
- [x] Moderação administrativa (`/community/moderation`, `Profile.role` MODERATOR/ADMIN)
- [x] Remover conteúdo (ocultar post / excluir comentário)
- [x] Histórico de denúncias
- [ ] Rate limiting — não implementado
- [ ] Proteção contra spam — não implementado

---

# 38. Códigos Beta e PremiumGrant

> Seção original de validação pós-implementação. A funcionalidade em si está
> implementada e em uso (confirmado lendo `POST /api/beta/redeem`,
> `GET /api/beta/status`, integração no onboarding e no Perfil/`/subscribe`).
> **A checklist de QA formal abaixo (38.1-38.12) não foi executada item a
> item como testes literais nesta sessão** — ver Parte 2 pra isso.

Confirmado por leitura direta do código:

- [x] Migration própria, `BetaCode`/`PremiumGrant` como models reais, relacionados a `Profile`
- [x] `codeHash` único (`@unique`), código puro nunca persistido
- [x] Um código = no máximo um usuário (`redeemedByUserId` único + claim atômico via `updateMany`)
- [x] Um usuário = no máximo um código Beta (checado antes do resgate)
- [x] Concorrência: claim atômico (`updateMany` com `WHERE redeemedByUserId: null`) — só um vencedor sob corrida
- [x] Retry idempotente: reenviar o mesmo código pelo mesmo usuário retorna o grant já existente, não duplica
- [x] Resolução central de Premium (`resolvePremiumAccess`): Stripe ativo OU `PremiumGrant` válido
- [x] Código Beta nunca mexe em `stripeSubscriptionId`/`subscriptionActive`
- [x] Usuário já Premium via Stripe não consegue consumir um código Beta (bloqueado explicitamente)
- [x] Campo de código no onboarding é opcional, nunca bloqueia o fluxo
- [x] Perfil mostra status Beta real (ativo até X / expirado), nunca expõe código/hash

---

# 40. Motor central de XP

**Corrigido nesta reorganização** — já existe e é exatamente isto:
`lib/community/gamification.ts` centraliza toda concessão de XP
(`awardXpEvent`/`tryCreateXpEvent`/`creditXp`), usado por refeição, atividade,
streak, desafio e conquista — nenhuma rota atualiza XP manualmente.

- [x] Serviço/função central de gamificação
- [x] Toda ação elegível passa pelo mesmo mecanismo
- [x] Reaproveita `XpEvent`
- [x] `idempotencyKey` único por evento (`meal_complete:...`, `activity:base:...`, `streak_milestone:...`, `challenge_complete:...`, `achievement:...`)
- [x] Retry/duplo clique não concede XP de novo
- [x] Histórico de XP existe (`XpEvent`, consultável, base do `getXpBreakdown`)

---

# 41. Streak / sequência real

**Corrigido nesta reorganização** — já formalizado via `qualifyDayForStreak`,
compartilhado entre refeição e atividade:

- [x] Regra de "dia qualificado" formalizada e centralizada
- [x] Não exige perfeição nem treino diário
- [x] `DailyActivity` como resumo diário real (`mealCompleted`, `physicalActivityCompleted`, `qualifiesForStreak`)
- [x] Timezone do usuário (`SocialProfile.timezone`), nunca UTC puro
- [x] `currentStreak`/`longestStreak` atualizados de forma idempotente, múltiplas ações no mesmo dia contam um único dia

---

# 43. Níveis

**Corrigido nesta reorganização** — já implementado em
`lib/community/achievements.ts` (`computeLevel`, `getLevelProgress`,
`LEVEL_THRESHOLDS`), exibido no Perfil e usado no ranking/ na Comunidade.

- [x] Curva de XP definida (0 / 250 / 750 / 1500 / 3000)
- [x] `computeLevel(totalXp)` centralizado
- [x] Progresso pro próximo nível calculado

---

# 47. Ordem atualizada de implementação — sessões concluídas

- [x] Sessão A — Fechar Perfil
- [x] Sessão B — Beta Premium
- [x] Sessão D — Gamificação (motor de XP)
- [x] Sessão E — Streak
- [x] Sessão F — Conquistas
- [x] Sessão G — Plano Semanal (funcionalidade central em uso extensivo; sem um registro de auditoria formal isolado)
- [x] Sessão H — Início / Dashboard
- [x] Sessão I — Lista de Compras (funcionalidade central em uso extensivo; sem um registro de auditoria formal isolado)
- [x] Sessão J — Assinatura (Premium resolvido centralmente, Beta + Stripe validados)
- [x] Sessão K — Comunidade final

Sessão C (Hidratação) não foi feita — ver Parte 2.

---

# 49. Sistema de Conquistas — tela principal

- [x] Contagem dinâmica (`X / 50`, nunca hardcoded)
- [x] Barra de progresso geral
- [x] Botão "Ver todas as conquistas" com filtros por status/categoria
- [x] Estado desbloqueado (ícone, badge, data, sem re-animação)
- [x] Estado bloqueado (opacidade reduzida, cadeado, "Como desbloquear", progresso real)
- [x] Estado "Em breve" (`COMING_SOON`) para o que depende de módulo ainda não implementado

---

# 50. Catálogo de conquistas

- [x] Catálogo central implementado (`lib/community/achievement-catalog.ts`), fiel ao spec original de 50 conquistas
- [x] 24+ conquistas `AVAILABLE` (onboarding, refeições, peso, fotos, social, atividade, meta pessoal)
- [ ] Conquistas de Hidratação (7) — continuam `COMING_SOON`, sem `WaterLog` (ver Parte 2)
- [ ] `FIRST_FAVORITE`/`FIRST_MEAL_SWAP` — continuam `COMING_SOON`, dependem de auditoria de favoritos/troca no Plano Semanal (ver Parte 2)
- [ ] `BALANCED_WEEK` — depende de hidratação (ver Parte 2)

---

# 51. Categorias oficiais

- [x] `ONBOARDING / FOOD / HYDRATION / STREAK / PROGRESS / ACTIVITY / SOCIAL / CHALLENGE / SPECIAL` — todas usadas consistentemente no catálogo

---

# 52. Catálogo central (padrão)

- [x] Código interno estável, separado do texto de exibição
- [x] `UserAchievement` referencia só o código
- [x] Catálogo não duplicado entre telas
- [x] Backend continua sendo a única autoridade para desbloqueio

---

# 53. Progresso incremental

- [x] Refeições
- [x] Peso
- [x] Atividades — **corrigido nesta reorganização**: `ActivityLog` existe, catálogo de atividade é `AVAILABLE`
- [x] Desafios — **corrigido nesta reorganização**: `FIRST_CHALLENGE_COMPLETED`/`FIRST_CHALLENGE_JOINED` são `AVAILABLE`
- [ ] Água — catálogo pronto, mas sem `WaterLog` ainda (`COMING_SOON`)
- [ ] Streak — catálogo pronto, mas regra formal de "dia ativo" definitiva do streak provisório antigo ainda não substitui os `STREAK_*` do catálogo novo (continuam `COMING_SOON` por decisão deliberada — ver seção 6)

Regras: [x] uma única fonte de cálculo, [x] `progress` nunca maior que `target` na UI, [x] `unlockedAt` nunca muda depois do desbloqueio.

---

# 54. Detalhes da conquista

- [x] Modal de detalhe (bloqueada: "Como desbloquear" + progresso; desbloqueada: data)

---

# 59. Integridade e segurança

- [x] Backend é autoridade
- [x] Frontend nunca desbloqueia conquista arbitrariamente
- [x] Não aceita `achievementCode` enviado pelo usuário como prova
- [x] Desbloqueia só a partir de evento real persistido
- [x] `@@unique([userId, achievementCode])` impede duplicidade
- [x] Retry idempotente
- [ ] Regras por dia/semana respeitando timezone — nenhuma regra `AVAILABLE` hoje depende de fronteira de dia/semana ainda (não é uma falha, é que ainda não se aplica)

---

# 60. Ordem de ativação — atualizada

- [x] WELCOME, BETA_TESTER, PROFILE_COMPLETE, GOAL_DEFINED, READY_TO_START
- [x] FIRST_MEAL, FULL_MEAL_DAY, FIRST_BREAKFAST, FIRST_LUNCH, FIRST_DINNER, MEALS_10, MEALS_50, MEALS_100
- [x] FIRST_WEIGHT_LOG, WEIGHT_LOGS_10, WEIGHT_LOGS_25, FIRST_PROGRESS_PHOTO, BEFORE_AFTER_READY
- [x] FIRST_POST, FIRST_FRIEND, FIRST_GROUP, FIRST_REACTION_RECEIVED, FIRST_COMMENT_RECEIVED
- [x] FIRST_ACTIVITY, ACTIVITIES_10, ACTIVITIES_50, ACTIVITIES_100, ACTIVE_3_DAYS_WEEK, ACTIVE_MINUTES_150, ACTIVITY_EXPLORER, ACTIVITY_WEEKS_CONSISTENCY, ACTIVE_30_DAYS_TOTAL — **corrigido**: todas `AVAILABLE` agora (ActivityLog real)
- [x] FIRST_CHALLENGE_COMPLETED — **corrigido**: `AVAILABLE` agora
- [x] PROGRESS_30_DAYS
- [x] PERSONAL_GOAL_REACHED — **corrigido**: `AVAILABLE` agora (sistema de metas real)

Pendentes (ver Parte 2/3): `FIRST_WATER_LOG` e demais conquistas de Hidratação, `STREAK_3`...`STREAK_365` (regra definitiva), `BALANCED_WEEK`, `FIRST_FAVORITE`, `FIRST_MEAL_SWAP`.

---

# 61. Critério para considerar a tela de conquistas pronta

- [x] `X / 50` é real
- [x] Nenhuma conquista desbloqueada é mock
- [x] Bloqueadas ficam opacas, mas legíveis
- [x] Desbloqueadas ficam destacadas
- [x] Todas mostram "Como desbloquear"
- [x] Incrementais mostram progresso real
- [x] Recursos ainda inexistentes aparecem como "Em breve"
- [x] Filtros funcionam
- [x] Desbloqueio persiste após logout/login
- [x] Mesma conquista nunca desbloqueia duas vezes
- [x] Nenhum dado privado é exposto
- [ ] Mobile validado visualmente — implementado com classes responsivas, mas sem navegador disponível neste ambiente pra validação visual real
- [ ] Datas respeitando timezone — não se aplica ainda (nenhuma regra `AVAILABLE` depende disso)

---

# PARTE 2 — 🔜 Ainda vai ser trabalhado

> Itens com escopo já claro, dependendo só de execução — não de uma decisão de produto em aberto.

# 39. Hidratação — próxima funcionalidade do núcleo

> Implementar depois de validar o sistema Beta (já validado — ver Parte 1, seção 38).

## 39.1 Estrutura

- [ ] Criar `WaterLog`
- [ ] Relacionar ao Profile/usuário
- [ ] Registrar quantidade em ml
- [ ] Registrar data/hora
- [ ] Criar meta diária de água
- [ ] Permitir meta configurável pelo usuário
- [ ] Tratar timezone corretamente

Modelo conceitual:

```prisma
model WaterLog {
  id        String   @id @default(uuid())
  userId    String
  amountMl  Int
  loggedAt  DateTime @default(now())
  createdAt DateTime @default(now())

  @@index([userId, loggedAt])
}
```

Possível campo: `dailyWaterGoalMl Int?`

## 39.2 API

- [ ] GET dos registros do dia
- [ ] POST novo consumo
- [ ] DELETE de registro incorreto
- [ ] Endpoint/resumo diário
- [ ] Validar quantidade no backend (nunca negativo, nunca absurdo)

## 39.3 Interface

```text
💧 Água

1.450 / 2.500 ml

[ +250 ml ] [ +500 ml ]

████████░░░░ 58%
```

- [ ] Card de hidratação no Início
- [ ] Total consumido + meta + barra de progresso
- [ ] Botões `+250 ml` / `+500 ml` / quantidade personalizada
- [ ] Permitir desfazer/excluir
- [ ] Estado vazio, loading, erros

## 39.4 Histórico

- [ ] Histórico diário e semanal
- [ ] Permitir corrigir registros

## 39.5 Gamificação futura

- [ ] Não dar XP a cada copo
- [ ] Evento `WATER_GOAL_COMPLETED`, no máximo 1x/dia, idempotente por usuário+data
- [ ] Ativa as 7 conquistas de Hidratação do catálogo (já prontas, `COMING_SOON`)
- [ ] Ativa `BALANCED_WEEK` (seção 50) em conjunto com atividade já pronta

---

# 38 (continuação) — QA formal do Beta ainda não executada

A funcionalidade está implementada (Parte 1). O que segue é rodar de fato este
roteiro de teste manual, item a item:

## Concorrência

- [ ] Testar duas requisições simultâneas com o mesmo código, confirmar que só uma recebe acesso e só um `PremiumGrant` é criado

## Teste real com múltiplos usuários

- [ ] Criar 2+ contas de teste distintas
- [ ] Ativar Código A com Conta A, confirmar Premium
- [ ] Tentar Código A com Conta B, confirmar rejeição
- [ ] Tentar outro código com Conta A (que já usou um), confirmar rejeição
- [ ] Logout/login, confirmar que o acesso Beta persiste corretamente

## Gerador administrativo

- [ ] Confirmar existência e funcionamento de um gerador de lote de códigos com alta entropia, hash-only no banco
- [ ] Confirmar que arquivo de códigos gerados (se existir) está no `.gitignore`

## Build

- [ ] Rodar `npm run build` focado nesta área e confirmar nenhum secret no bundle do client

---

# 11 (continuação) — Strava, fluxos ainda não exercitados ao vivo

- [ ] Observar uma renovação automática de token acontecendo de verdade (token atual não expirou durante os testes)
- [ ] Exercitar desconectar Strava com uma conta de teste (revogação + limpeza local)
- [ ] Rodar uma segunda sincronização real pra confirmar que o filtro incremental (`after`/`lastSyncedAt`) evita rebuscar tudo de novo
- [ ] Registrar e testar webhooks reais do Strava (`npm run strava:webhook -- create <callbackUrl>`) quando houver domínio de produção

---

# Achievements — auditorias pendentes

- [ ] Auditar favoritos/troca de refeição no Plano Semanal, pra decidir se `FIRST_FAVORITE`/`FIRST_MEAL_SWAP` já podem virar `AVAILABLE`
- [ ] Decidir se vale migrar o botão de "Compartilhar streak" (seção 25) pro Composer unificado, em vez do publish direto atual

---

# 28 (parcial) — Feed mais inteligente, filtros restantes

O núcleo (Para Você / Amigos, feed heurístico) já está pronto (Parte 1, seção
19 do checklist de hashtags/feed). Falta:

- [ ] Filtros de tipo adicionais no feed: Alimentação (`PLAN_SHARE`), Desafios/Progresso — hoje só Tudo/Atividades/Conquistas/Compartilhados
- [ ] Silenciar tipos de conteúdo (preferência persistente, não só "não tenho interesse" por post)
- [ ] Ocultar atividade de um usuário específico sem bloqueá-lo (hoje só existe bloqueio completo)

---

# 29 (parcial) — Privacidade, tela central

As regras já são aplicadas em todo o app (XP/streak/conquistas
mostrar/ocultar via `SocialProfile`; atividade/progresso privados por
padrão; apps conectados com desconexão e última sincronização visíveis).
Falta:

- [ ] Uma tela única "Privacidade" que reúna esses controles hoje espalhados (edição de perfil, `/profile/connected-apps`) num só lugar

---

# 32 (parcial) — Moderação, proteção restante

- [ ] Rate limiting em denúncias/posts/comentários
- [ ] Proteção contra spam

---

# PARTE 3 — ⏸️ Pendente para depois

> Ideias de backlog, evoluções de longo prazo, ou itens que o texto original já descrevia como "futuro"/"não definir ainda" — sem compromisso de data.

# 13. Health Connect — Android

## Futuro

- [ ] Pesquisar integração Android Health Connect
- [ ] Ler permissões de atividade autorizadas
- [ ] Importar dados compatíveis (passos, exercícios, distância, duração)
- [ ] Definir quais dados realmente fazem sentido no SmartPlate
- [ ] Permitir revogar permissões
- [ ] Mostrar fonte do dado

---

# 14. Apple Health / HealthKit — iOS

## Futuro

- [ ] Criar camada específica para iOS
- [ ] Solicitar permissões individualmente
- [ ] Importar atividades/treinos autorizados
- [ ] Integrar ao mesmo `ActivityLog`
- [ ] Não criar arquitetura paralela ao Android

---

# 15. Garmin

- [ ] Avaliar API/programa oficial disponível na época da implementação
- [ ] Conectar conta, importar atividades permitidas, converter para `ActivityLog`
- [ ] Respeitar políticas de compartilhamento
- [ ] Evitar duplicidade caso a mesma atividade venha do Strava

---

# 16. Detecção de duplicidade (multi-integração)

Só relevante quando existir mais de uma integração ativa (Garmin/Health
Connect/Apple Health além do Strava):

```text
Garmin → Strava → SmartPlate
```

- [ ] Detectar `externalId`
- [ ] Detectar atividades muito semelhantes
- [ ] Evitar XP duplicado
- [ ] Permitir definir uma fonte preferencial
- [ ] Manter origem original quando possível

---

# 20. IA + atividade física

## Futuro

- [ ] IA gerar resumo semanal (hoje: insights determinísticos + IA já existem — seção 19 — mas sem tocar no *plano alimentar*)
- [ ] IA identificar mudanças de rotina
- [ ] IA usar atividade como contexto de personalização do plano
- [ ] IA considerar dias mais ativos no plano
- [ ] IA sugerir organização das refeições em dias de treino
- [ ] Evitar recomendações médicas indevidas
- [ ] Não inferir gasto calórico exato sem fonte confiável

---

# 21. Calendário / Timeline

```text
23 AGO
08:00  Café da manhã concluído
12:30  Almoço concluído
17:00  🏃 Corrida — 35 min
20:30  Jantar concluído
22:00  ⚖️ Peso registrado
```

- [ ] Refeições, atividades, peso, fotos de progresso, conquistas, desafios numa visão diária unificada

---

# 22. Antes & Depois / progresso social

A seção de Antes & Depois deve permanecer privada por padrão.

- [ ] Botão explícito `Compartilhar progresso`
- [ ] Escolher foto(s) e quais informações mostrar
- [ ] Ocultar peso por padrão
- [ ] Permitir legenda
- [ ] Compartilhar na comunidade geral ou em grupo
- [ ] Nunca publicar automaticamente

---

# 23. Compartilhamento de refeições (refinamento)

`PostType.PLAN_SHARE` já permite compartilhar um **plano** inteiro (Parte 1,
seção 12 do checklist de hashtags/feed). O que falta é mais granular:

- [ ] Compartilhar uma refeição concluída específica (não o plano inteiro)
- [ ] Compartilhar receita isoladamente
- [ ] Compartilhar refeição favorita
- [ ] Mostrar nome e macros apenas se o usuário quiser (hoje o card mostra nome do plano/dieta, não macros)

---

# 30. Notificações sociais (restante)

Já existe notificação real de desafio concluído (`Notification` model). Falta:

- [ ] Nova solicitação de amizade
- [ ] Amizade aceita
- [ ] Comentário / reação recebidos
- [ ] Convite para grupo
- [ ] Desafio iniciado
- [ ] Conquista desbloqueada
- [ ] Streak em risco
- [ ] Meta semanal atingida

---

# 31. Configuração de notificações

Não adicionar toggles falsos antes de existir persistência real.

- [ ] Social, Refeições, Atividades, Desafios, Streak, Progresso, Lembretes — cada categoria configurável e persistida

---

# 33. Métricas de saúde do produto

Não confundir com dados médicos — métricas internas do SmartPlate:

- [ ] Usuários ativos, atividades registradas, refeições concluídas, taxa de adesão, desafios concluídos, posts por semana, retenção, streak médio, uso de grupos, uso de integrações

---

# 34. Arquitetura sugerida (referência)

```text
                        SMARTPLATE
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
      Alimentação       Atividade         Progresso
          │                 │                 │
      MealPlan          ActivityLog       WeightLog
          │                 │            ProgressPhoto
          └──────────┬──────┴───────┬─────────┘
                     │              │
                  Gamificação     Insights
                     │
        ┌────────────┼─────────────┐
        │            │             │
       XP        Conquistas     Desafios
        │            │             │
        └────────────┼─────────────┘
                     │
                 Comunidade
                     │
        ┌────────────┼─────────────┐
        │            │             │
       Feed         Grupos       Ranking
```

```text
Strava ───────────────┐
Garmin ───────────────┤
Health Connect ───────┤
Apple Health ─────────┼──> Integration Layer ──> ActivityLog
Samsung Health ───────┤
Manual ───────────────┘
```

---

# 35-36. Ordem original de implementação e princípios do produto (referência histórica)

Mantidos como norteadores, não como tarefa em si — a maior parte do que
estava listado em "Fase atual"/"Próxima fase" já foi concluída (ver Parte 1).

Princípios que continuam valendo pra qualquer trabalho futuro:

- Dados privados não devem virar conteúdo social automaticamente
- Compartilhamento deve ser escolha explícita do usuário
- Não criar métricas falsas nem mocks
- Não adicionar controles que não persistem
- `SocialProfile` contém apenas identidade pública — peso, saúde, fotos e objetivos permanecem privados
- XP deve recompensar consistência, não comportamento extremo
- Integrações externas devem respeitar as políticas de cada provedor
- Dados sincronizados e dados compartilhados são conceitos diferentes
- Construir funcionalidades reutilizáveis, não fluxos duplicados
- Preparar o modelo interno para receber novas fontes no futuro

---

# 37. Ideias extras para avaliar posteriormente

- [ ] Medalhas sazonais, eventos da comunidade, desafios oficiais SmartPlate
- [ ] Perfil com vitrine de conquistas, cards compartilháveis em redes sociais
- [ ] Resumo semanal/mensal visual, comparação consigo mesmo
- [ ] Calendário de consistência estilo GitHub, heatmap de atividades/refeições
- [ ] Metas personalizadas mais elaboradas, sistema de níveis mais rico
- [ ] Títulos de perfil desbloqueáveis, recompensas cosméticas, badges de eventos
- [ ] Reações especiais, comentários com mídia
- [ ] Compartilhamento de receitas, favoritos sociais
- [ ] Sugestões de amigos, convite por link
- [ ] Deep links no app mobile, widgets Android/iOS, push notifications
- [ ] Resumo de atividade no mobile, sincronização em background no app mobile

---

# 42.2. Conquistas de Hidratação

> Nota: a seção original 42 tinha 5 subseções (Alimentação/Hidratação/Streak/
> Progresso/Beta). 42.1, 42.3, 42.4 e 42.5 foram absorvidas pelo catálogo real
> de conquistas (Parte 1, seções 50/60 — `FIRST_MEAL`/`MEALS_10`,
> `STREAK_3`...`STREAK_100`, `FIRST_WEIGHT_LOG`/`FIRST_PROGRESS_PHOTO`,
> `BETA_TESTER`), por isso não aparecem de novo aqui. Só 42.2 (Hidratação)
> continua genuinamente pendente.

- [ ] Primeira meta diária de água, meta em 3/7/30 dias — depende inteiramente da seção 39 (Hidratação), que já está na Parte 2

---

# 44. Planos Free x Premium — NÃO definir ainda

> Esta etapa deve acontecer somente quando o aplicativo estiver funcional e os módulos principais estiverem fechados.

## Manter por enquanto

- [x] Preservar regras atuais
- [x] Beta passa pelos gates Premium já existentes
- [x] Stripe continua funcionando
- [x] Nenhuma restrição artificial foi criada

## Definir posteriormente

- [ ] Quantidade de gerações de plano alimentar no Free, limite de uso de IA, regenerações, limites da lista de compras
- [ ] Recursos de personalização, histórico disponível, recursos de comunidade/grupos, integrações externas
- [ ] Relatórios, insights de IA, Antes & Depois como recursos Premium exclusivos
- [ ] Estratégia de upgrade, trial, grace period, expiração/cancelamento, downgrade
- [ ] Comparativo visual Free x Premium

## Critério importante antes de restringir qualquer recurso

- [ ] Confirmar que o recurso funciona 100%, tem valor real, não é de segurança essencial
- [ ] Não apagar/prejudicar dados já criados após downgrade ou expiração

---

# 45. Painel administrativo Beta

> Não é necessário para testar agora, mas será útil antes de ampliar o Beta.

- [ ] Área administrativa protegida com totais de códigos (criados/disponíveis/usados/desativados), data de resgate, usuário associado
- [ ] Permitir desativar código não utilizado, criar novo lote, escolher duração/`redeemUntil`
- [ ] Nunca exibir código puro depois da geração
- [ ] Permitir revogar `PremiumGrant` administrativamente, com auditoria

---

# 46. Códigos promocionais — evolução futura

Possíveis categorias futuras: `BETA / PROMO / PARTNER / GIFT / ADMIN`.

- [ ] Generalizar somente quando houver necessidade real — não transformar `BetaCode` em sistema complexo agora
- [ ] Campanhas promocionais, quantidade máxima de usos, datas de validade, duração Premium
- [ ] Códigos de parceiros, gifts, grants administrativos

---

# 48. Regra para considerar cada sessão concluída (apêndice metodológico)

Critério usado (e que deve continuar sendo usado) para qualquer sessão futura:

- Não depender de mock; dados persistidos; backend valida entrada
- Frontend trata loading, erro e estado vazio
- Usuário não consegue acessar dados de outro usuário
- Retry não cria duplicidade; build funciona
- Fluxo funciona após logout/login, com usuário antigo e usuário novo
- Não quebra Comunidade nem Stripe; não expõe informações privadas

---

# 55 (restante) — Nova conquista desbloqueada, versão enriquecida

Hoje a celebração é só toast (`react-hot-toast`). Fica pra depois:

- [ ] Modal enriquecido (com "Ver conquista"/"Continuar") em vez de só toast
- [ ] Fila/resumo quando várias conquistas são desbloqueadas juntas (hoje empilha toasts sem fila controlada)

---

# 56. Compartilhamento de conquistas — refinamentos futuros

O compartilhamento básico já existe (Parte 1, seção 24). Ideias de evolução:

- [ ] Card de compartilhamento com layout dedicado além do genérico do `PostCard`

---

# 57. XP por conquista — valores finais

Os valores atuais (`ACHIEVEMENT_RARITY_XP`: COMMON +10, UNCOMMON +20, RARE
+40, EPIC +75, SPECIAL +100) já estão em produção e funcionando. Ajuste fino
de valores continua uma decisão de produto em aberto:

- [ ] Revisar/ajustar valores de XP por raridade com base em uso real

---

# 58. Raridade — exibição na UI

A raridade já existe no código (`AchievementRarity`, usada pro cálculo de
XP). Não é obrigatório mostrá-la visualmente na tela de conquistas ainda:

- [ ] Mostrar selo/cor de raridade nos cards de conquista

---

# XP de hoje — breakdown diário no Dashboard

`getXpBreakdown()` já existe e expõe a soma de XP por fonte (vitalícia, não
diária) via `GET /api/community/gamification`. O que a seção original 40.5
descrevia — um card "Hoje +30 XP" com a lista de ações específicas do dia
("+5 Café concluído", "+10 Meta de água", etc.) — não existe ainda:

- [ ] Card "XP de hoje" no Início, com breakdown por ação do dia
