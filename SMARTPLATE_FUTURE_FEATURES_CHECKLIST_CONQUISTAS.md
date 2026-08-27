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
- [ ] Metas coletivas — só existem metas individuais (`ActivityGoal`), não metas de grupo. **Deliberadamente adiado em 2026-08-27**: abrir um domínio novo de gamificação por grupo (quem define a meta, quem é recompensado) merece decisão de produto própria — ver "Estatísticas do grupo" abaixo, que cobre a parte de leitura sem esse risco.
- [ ] Conquistas do grupo — só existem conquistas individuais. Mesmo motivo do item acima, adiado deliberadamente.
- [x] Estatísticas do grupo — **Implementado em 2026-08-27**: aba "Estatísticas" em `/community/groups/[id]` (`components/social/GroupStatsPanel.tsx`, `GET /api/community/groups/[id]/stats`) — membros ativos, atividades e refeições concluídas na semana atual (janela UTC uniforme, mesmo padrão do ranking geral). Leitura pura, nenhum model novo de escrita.
- [ ] Moderação específica de grupo — moderação continua central (Comunidade geral), sem ferramentas extras por grupo (decisão de escopo já registrada, não revisitada nesta rodada)

---

# 27. Desafios colaborativos

**Corrigido nesta reorganização** — o núcleo já existe via desafios de grupo (seção 7):

- [x] Barra de progresso do grupo (`collective`: soma do progresso de cada participante)
- [x] Recompensa para todos os participantes (cada um recebe XP ao completar, via `recordChallengeCompletion`)
- [x] Celebração automática quando concluído (`Notification` real)
- [x] Meta coletiva "editorial" — **Implementado em 2026-08-27** (versão mínima): novo campo opcional `Challenge.collectiveTarget`. Quem cria um desafio de grupo pode definir uma meta coletiva explícita em `CreateChallengeModal.tsx`; quando ausente, o ranking continua derivando automaticamente (`target * participantes`, via `lib/community/gamification.ts::deriveCollectiveTarget`, testado). Não muda a recompensa individual.

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
- [x] Rate limiting — **Implementado em 2026-08-27**: `lib/community/rate-limit.ts`, contagem via Postgres (sem Redis/Upstash — nenhum serviço de cache configurado no projeto ainda). Limites: criar post 10/hora, criar comentário 30/hora, denunciar 20/hora. Retorna 429 com mensagem clara ao exceder.
- [ ] Proteção contra spam — além do rate limiting acima, nenhuma heurística adicional (detecção de conteúdo repetido, etc.) foi implementada.

---

# 38. Códigos Beta e PremiumGrant

> Seção original de validação pós-implementação. A funcionalidade em si está
> implementada e em uso (confirmado lendo `POST /api/beta/redeem`,
> `GET /api/beta/status`, integração no onboarding e no Perfil/`/subscribe`).
> **Atualização 2026-08-25**: a QA formal abaixo (ver "38 (continuação)") foi
> executada nesta sessão — concorrência e múltiplos-códigos/usuários agora
> têm cobertura automatizada real (`tests/beta/redeem-concurrency.test.ts`,
> contra o banco de fato via `Promise.all`, não simulação); a entropia do
> gerador de códigos foi corrigida (era insuficiente — ver item novo abaixo).
> O único item que continua pendente é o ciclo logout/login com conta Clerk
> real (ver "38 (continuação)" para o porquê e o roteiro manual).

Confirmado por leitura direta do código:

- [x] Migration própria, `BetaCode`/`PremiumGrant` como models reais, relacionados a `Profile`
- [x] `codeHash` único (`@unique`), código puro nunca persistido
- [x] Um código = no máximo um usuário (`redeemedByUserId` único + claim atômico via `updateMany`)
- [x] Um usuário = no máximo um código Beta (checado antes do resgate)
- [x] Concorrência: claim atômico (`updateMany` com `WHERE redeemedByUserId: null`) — só um vencedor sob corrida — **agora com teste automatizado real** (`tests/beta/redeem-concurrency.test.ts`, 2 e 10 requisições concorrentes via `Promise.all`)
- [x] Retry idempotente: reenviar o mesmo código pelo mesmo usuário retorna o grant já existente, não duplica — testado
- [x] Resolução central de Premium (`resolvePremiumAccess`): Stripe ativo OU `PremiumGrant` válido
- [x] Código Beta nunca mexe em `stripeSubscriptionId`/`subscriptionActive`
- [x] Usuário já Premium via Stripe não consegue consumir um código Beta (bloqueado explicitamente) — testado
- [x] Campo de código no onboarding é opcional, nunca bloqueia o fluxo
- [x] Perfil mostra status Beta real (ativo até X / expirado), nunca expõe código/hash
- [x] **Corrigido 2026-08-25**: entropia do gerador insuficiente (3 segmentos de 4 caracteres ≈ 59,4 bits, abaixo do mínimo de 128) — aumentado para 7 segmentos (≈ 138,7 bits, alfabeto real de 31 símbolos sem 0/O/1/I/L) em `lib/beta/codes.ts` e `scripts/generate-beta-codes.cjs`, com validação retrocompatível (aceita o formato antigo de 3 segmentos já distribuído). Continua usando `crypto.randomBytes` (nunca `Math.random`), hash SHA-256 sem pepper — aceitável aqui porque a entropia do próprio código (não uma senha escolhida por humano) já torna força-bruta inviável. Coberto por `tests/beta/codes.test.ts`.
- [x] Lógica de resgate extraída para `lib/beta/redeem.ts` (`redeemBetaCodeForUser`), reutilizada pela rota HTTP e pelos testes automatizados — mesmo comportamento, sem duplicar regra

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
- [x] **Atualizado 2026-08-25**: Conquistas de Hidratação (7) — `WaterLog` implementado, critério real conectado, `AVAILABLE` (ver seção 39)
- [ ] `FIRST_FAVORITE`/`FIRST_MEAL_SWAP` — continuam `COMING_SOON`, dependem de auditoria de favoritos/troca no Plano Semanal (fora do escopo desta sessão)
- [x] **Atualizado 2026-08-25**: `BALANCED_WEEK` — hidratação pronta, critério combinado (refeição + atividade + água na mesma semana) testado e `AVAILABLE` (ver seção 39)

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
- [x] Água — **atualizado 2026-08-25**: `WaterLog` implementado, catálogo `AVAILABLE` (ver seção 39)
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

# 39. Hidratação — implementado

> **Atualização 2026-08-25**: implementado e testado nesta sessão. Evidência:
> `prisma/migrations/20260825120000_add_hydration/`, `lib/hydration/*`,
> `app/api/hydration/*`, `hooks/useHydration.tsx`, `components/Hydration*.tsx`,
> 45 testes automatizados em `tests/hydration/*` (todos passando). Distinção
> importante: tudo abaixo está **implementado e testado automaticamente**
> (backend/domínio, contra o banco real). A validação manual da interface no
> navegador **não foi executada** nesta sessão — não há ferramenta de
> automação de navegador disponível no ambiente; o card foi verificado via
> build de produção bem-sucedido, TypeScript/lint limpos, e chamadas HTTP
> reais ao servidor de dev confirmando a rejeição de requisições sem sessão
> (ver seção 38). Recomenda-se uma passada visual manual antes de considerar
> a tela 100% validada para usuários reais.

## 39.1 Estrutura

- [x] Criado `WaterLog` (migration `20260825120000_add_hydration`)
- [x] Relacionado ao `Profile` via `@relation` real em `userId` (FK, `onDelete: Cascade`), não um `userId` solto
- [x] Quantidade em ml (`amountMl Int`, validado 1-5000)
- [x] Data/hora (`loggedAt DateTime`, default `now()`)
- [x] Meta diária de água — campo `Profile.dailyWaterGoalMl Int @default(2500)`
- [x] Meta configurável pelo usuário (`GET`/`PATCH /api/hydration/goal`, validado 500-10000ml)
- [x] Timezone tratado corretamente — reaproveita `lib/community/dates.ts` (já existente, usado por atividades/streak/ranking), sem nenhum offset fixo hardcoded; "hoje" sempre calculado a partir de `SocialProfile.timezone` (IANA, já coletado no onboarding), com fallback seguro pra UTC se inválido/ausente

Modelo conceitual original (mantido acima como referência histórica) — implementado com adaptações à arquitetura real do projeto: relação formal a `Profile` (não `userId` solto), sem coluna extra de status, e `dailyWaterGoalMl` vive em `Profile` (não em `WaterLog`):

```prisma
model WaterLog {
  id       String   @id @default(uuid())
  userId   String
  profile  Profile  @relation(fields: [userId], references: [userId], onDelete: Cascade)
  amountMl Int
  loggedAt DateTime @default(now())
  createdAt DateTime @default(now())

  @@index([userId, loggedAt])
}
```

## 39.2 API

- [x] GET dos registros do dia (`GET /api/hydration/logs?date=`, timezone-aware, só os registros do próprio usuário)
- [x] POST novo consumo (`POST /api/hydration/logs`, valida `amountMl`/`loggedAt`, default `loggedAt` = agora)
- [x] DELETE de registro incorreto (`DELETE /api/hydration/logs/[id]`, ownership confirmada no próprio `deleteMany({where:{id,userId}})`, 404 se não existir/não for do usuário)
- [x] **Adicionado além do previsto originalmente**: PATCH de correção (`PATCH /api/hydration/logs/[id]`, mesma validação da criação, mesma proteção de propriedade)
- [x] Endpoint de resumo diário (`GET /api/hydration/summary`) no formato exato pedido (`date`, `timezone`, `totalMl`, `goalMl`, `remainingMl`, `progressPercentage`, `goalCompleted`, `logs`) — `remainingMl` nunca negativo, `totalMl` real nunca truncado acima da meta, `progressPercentage` limitado a 100 só na exibição
- [x] **Adicionado além do previsto originalmente**: endpoint de histórico semanal (`GET /api/hydration/history`)
- [x] Validação de quantidade no backend via Zod (`lib/hydration/validation.ts`) — nunca negativo/zero/decimal/acima do máximo, nunca confia só na validação do cliente

## 39.3 Interface

```text
💧 Água

1.450 / 2.500 ml

[ +250 ml ] [ +500 ml ] [ Outro valor ]

████████░░░░ 58%
```

- [x] Card de hidratação no Início (`components/HydrationCard.tsx`, integrado em `HomeDashboard.tsx`; StatCard de hidratação no topo também passou a mostrar dado real em vez de "em breve")
- [x] Total consumido + meta + restante + percentual + barra de progresso
- [x] Botões `+250 ml` / `+500 ml` / quantidade personalizada (modal dedicado, `HydrationCustomAmountModal.tsx`)
- [x] Desfazer (toast com botão "Desfazer" que exclui exatamente o registro recém-criado pelo id retornado pela API, nunca "o mais recente" por ordenação) e excluir (no histórico)
- [x] Estado vazio (card continua mostrando os botões de registro), loading (skeleton), erro de carregamento (com botão "Tentar de novo"), erro de mutação (toast), sucesso (toast + atualização otimista), meta atingida, consumo acima da meta — todos implementados; **não exercitados visualmente num navegador real nesta sessão** (ver nota no topo da seção)

## 39.4 Histórico

- [x] Histórico diário e semanal (`HydrationHistoryModal.tsx` — barras simples e acessíveis por dia da semana local, sem nova biblioteca de gráficos, reaproveitando o padrão de card/modal já usado no resto do app)
- [x] Permitir corrigir registros (editar quantidade e horário) e excluir registros incorretos, direto no histórico

## 39.5 Gamificação — implementado

- [x] Não dá XP a cada copo (evento gravado com `points: 0`, só gateia idempotência/conquista)
- [x] Evento `WATER_GOAL_COMPLETED`, no máximo 1x por usuário por data local, idempotente — **testado automaticamente** (`tests/hydration/gamification.test.ts`): primeira vez, múltiplos copos depois de bater a meta, duas chamadas concorrentes via `Promise.all`, apagar-e-recriar no mesmo dia, novo dia permite novo evento, meta não atingida não gera evento. Garantia real é no banco (`idempotencyKey` único + captura de P2002), não só na UI. Alterar a meta isoladamente nunca aciona o evento (a reavaliação só é chamada pelas rotas de registro de consumo, nunca pela rota de meta — `app/api/hydration/goal/route.ts` nunca importa `reevaluateWaterGoalForDay`)
- [x] Ativa as 7 conquistas de Hidratação do catálogo (`FIRST_WATER_LOG`, `FIRST_WATER_GOAL`, `WATER_GOAL_3_DAYS`, `WATER_GOAL_7_DAYS`, `WATER_GOAL_30_DAYS`, `WATER_LOGS_50`, `WATER_WEEK_CONSISTENCY`) — de `COMING_SOON` para `AVAILABLE`, critério real conectado a dados reais em `lib/community/achievement-engine.ts`, **testado individualmente** em `tests/hydration/achievements.test.ts` (positivo e negativo)
- [x] Ativa `BALANCED_WEEK` (seção 50) em conjunto com atividade física já implementada — critério usado: pelo menos um dia com refeição concluída, um dia com atividade física e um dia com meta de água atingida, na mesma semana local (não necessariamente o mesmo dia; o catálogo original não especifica um número de dias para este código especificamente, diferente do `BALANCED_ROUTINE_WEEK`, que exige 5 dias — interpretação registrada como tal em `lib/hydration/gamification.ts`, não uma regra inventada). **Testado automaticamente, positivo e negativo** (`tests/hydration/gamification.test.ts` e `tests/hydration/achievements.test.ts`)

---

# 38 (continuação) — QA formal do Beta

> **Atualização 2026-08-25**: executado nesta sessão. Ambiente usado: o banco
> configurado em `DATABASE_URL` (`.env`) — só existe um banco no projeto, sem
> branch de teste dedicada; usado com contas fixture sintéticas
> (`userId` prefixado com `test-`, formato que o Clerk nunca gera), sempre
> criadas e removidas dentro do próprio teste (`tests/helpers/fixtures.ts`).
> Confirmado por contagem de linhas antes/depois (`Profile`/`BetaCode`/
> `PremiumGrant`) que a suíte não deixou nenhum resíduo. Nenhum dado de
> conta real foi lido, alterado ou exposto.

## Concorrência

- [x] **Testado automaticamente** (`tests/beta/redeem-concurrency.test.ts`): duas requisições simultâneas com o mesmo código via `Promise.all` contra o banco real — confirmado que só uma recebe acesso (`ok:true`), a outra é rejeitada com 409, e só um `PremiumGrant` é criado. Repetido também com 10 requisições concorrentes (só 1 vencedora, 9 rejeitadas) para reforçar a garantia sob carga maior.

## Teste real com múltiplos usuários

- [x] **Testado automaticamente** com contas fixture sintéticas (não contas Clerk reais — ver nota acima): Ativar Código A com Conta A → confirma Premium (`PremiumGrant` criado, `expiresAt` futuro)
- [x] **Testado automaticamente**: Tentar Código A com Conta B → rejeição (409)
- [x] **Testado automaticamente**: Tentar Código B (não usado) com Conta A (que já usou o Código A) → rejeição
- [x] **Testado automaticamente** (bônus, não pedido originalmente): reenviar o mesmo código pela mesma conta (retry) → idempotente, não duplica o `PremiumGrant`; código inativo/expirado/conta já Premium via Stripe → rejeitados sem consumir o código
- [ ] **Pendente — bloqueado por ambiente**: logout/login com conta Clerk real, confirmando que o acesso Beta persiste e a autorização do backend reconhece corretamente após a nova sessão. Não há credenciais de conta Clerk de teste nem uma forma de automatizar login/logout do Clerk neste ambiente (sem navegador/browser automation disponível na sessão). **Roteiro manual para quem for validar**: 1) criar/usar uma conta real no ambiente de dev; 2) resgatar um código Beta gerado por `npm run beta:generate -- --count 1 --days 30`; 3) confirmar acesso Premium no `/subscribe` ou Perfil; 4) fazer logout; 5) fazer login de novo com a mesma conta; 6) confirmar que o Perfil/`/subscribe` ainda mostra o Beta ativo (a leitura vem de `resolvePremiumAccess` no backend a partir do `PremiumGrant`, não de estado de sessão/cliente, então o resultado esperado é persistir — mas isso não foi observado ao vivo nesta sessão).

## Gerador administrativo

- [x] Confirmado e **corrigido**: gerador existe (`scripts/generate-beta-codes.cjs`), usa `crypto.randomBytes` (nunca `Math.random`), grava só o hash no banco. A entropia estava insuficiente (≈59,4 bits) — corrigida para ≈138,7 bits (ver seção 38 acima). Testado em `tests/beta/codes.test.ts` (formato, alfabeto, entropia, compatibilidade retroativa).
- [x] Confirmado: `/generated/beta-codes-*.txt` está no `.gitignore` (linha já existente, não precisou de alteração); confirmado via `git ls-files`/`git status` que nenhum arquivo de códigos está rastreado; confirmado via `git grep` que nenhum código Beta real está hardcoded em nenhum arquivo rastreado (só placeholders de UI como `SPBETA-XXXX-XXXX-XXXX`)

## Build

- [x] `npm run build` executado com sucesso (sem erros novos). Auditoria específica: nenhum `process.env` em `components/`/`hooks/`; nenhum import de `lib/prisma`, `lib/beta/codes` ou `lib/beta/redeem` em componente/hook cliente; único env var com prefixo `NEXT_PUBLIC_` é `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (público por design do Clerk); `DATABASE_URL`/`CLERK_SECRET_KEY`/`STRIPE_SECRET_KEY`/demais secrets sem prefixo público. Nenhum valor real de secret foi impresso neste processo.
- [x] Teste HTTP ao vivo (servidor de dev local, `curl`): todas as rotas novas (`/api/hydration/*`, `/api/beta/redeem`) retornam 307 com `x-clerk-auth-status: signed-out` para requisição sem sessão — mesmo comportamento de uma rota já existente (`/api/activities`) usada como controle.

## Nota de evidência — Hidratação (seção 39) + QA Beta (seção 38), 2026-08-25

- **Banco/migration**: `prisma/migrations/20260825120000_add_hydration/` (aditiva — `WaterLog`, `Profile.dailyWaterGoalMl`, `DailyActivity.waterGoalCompleted`), aplicada via workflow seguro (`migrate diff` + `db execute` + `migrate resolve`, nunca `db push`/`migrate reset`), `prisma validate`/`prisma generate` ok, `prisma migrate status` confirma "up to date".
- **Principais arquivos novos**: `lib/hydration/{validation,stats,gamification}.ts`, `app/api/hydration/{logs,logs/[id],goal,summary,history}/route.ts`, `hooks/useHydration.tsx`, `components/Hydration{Card,CustomAmountModal,GoalModal,HistoryModal}.tsx`, `lib/beta/redeem.ts`, `tests/**`.
- **Principais arquivos alterados**: `prisma/schema.prisma`, `lib/community/dates.ts` (nova `withTimezoneBuffer`, reexportada em `lib/activity/stats.ts` por compatibilidade), `lib/community/achievement-catalog.ts`/`achievement-engine.ts` (hidratação + `BALANCED_WEEK` de `COMING_SOON` para `AVAILABLE`), `lib/beta/codes.ts` + `scripts/generate-beta-codes.cjs` (entropia), `app/api/beta/redeem/route.ts` (agora chama `lib/beta/redeem.ts`), `components/HomeDashboard.tsx`.
- **Testes**: infraestrutura mínima nova — Node `node:test` + `tsx` (só pra resolver os aliases `@/` e TypeScript que o projeto já usa; nenhum framework de teste como Jest/Vitest/Mocha foi adicionado). `npm test` → **67/67 testes passando** (`tests/hydration/*`: validação, timezone/fronteira de dia, CRUD, propriedade/segurança no nível do banco, idempotência/concorrência da gamificação, conquistas; `tests/beta/*`: formato/entropia dos códigos, concorrência real e múltiplos usuários/códigos do resgate Beta). Banco usado nos testes é o mesmo de `DATABASE_URL` — sem branch de teste dedicada no projeto; todas as fixtures são sintéticas (`userId` prefixado `test-`) e comprovadamente limpas ao final (contagem de linhas antes/depois idêntica).
- **Lint/typecheck/build**: `npx tsc --noEmit` limpo (0 erros); `next lint` sem nenhum warning novo nos arquivos desta tarefa (warnings restantes são todos pré-existentes, em arquivos não tocados); `npm run build` concluído com sucesso, todas as rotas novas aparecem no manifesto.
- **Pendências e por quê**: (1) ciclo logout/login com conta Clerk real para o Beta — bloqueado por falta de credenciais de teste e de automação de navegador neste ambiente, roteiro manual documentado acima; (2) validação visual manual da interface de hidratação num navegador — não executada (sem ferramenta de browser automation disponível), compensada parcialmente por build bem-sucedido + testes de domínio/API + checagem HTTP ao vivo de autenticação.

---

# 11 (continuação) — Strava, fluxos ainda não exercitados ao vivo

- [x] Cobertura de teste da janela incremental de sincronização — **Implementado em 2026-08-27**: `computeStravaSyncAfterEpoch` extraída de `app/api/integrations/strava/sync/route.ts` para `lib/integrations/strava.ts` (mesmo comportamento, sem mudança funcional) e testada em `tests/integrations/strava.test.ts`. Antes não havia nenhum teste automatizado nesta lógica.
- [ ] Observar uma renovação automática de token acontecendo de verdade (token atual não expirou durante os testes)
- [ ] Exercitar desconectar Strava com uma conta de teste (revogação + limpeza local)
- [ ] Rodar uma segunda sincronização real pra confirmar que o filtro incremental (`after`/`lastSyncedAt`) evita rebuscar tudo de novo — a lógica em si já está testada (item acima); falta só a execução ao vivo.
- [ ] Registrar e testar webhooks reais do Strava (`npm run strava:webhook -- create <callbackUrl>`) quando houver domínio de produção

---

# Achievements — auditorias pendentes

- [ ] Auditar favoritos/troca de refeição no Plano Semanal, pra decidir se `FIRST_FAVORITE`/`FIRST_MEAL_SWAP` já podem virar `AVAILABLE`
- [ ] Decidir se vale migrar o botão de "Compartilhar streak" (seção 25) pro Composer unificado, em vez do publish direto atual

---

# 28 (parcial) — Feed mais inteligente, filtros restantes

O núcleo (Para Você / Amigos, feed heurístico) já está pronto (Parte 1, seção
19 do checklist de hashtags/feed). Falta:

- [x] Filtro "Alimentação" (`PLAN_SHARE`) no feed — **Implementado em 2026-08-27**: aba adicionada em `components/social/PostFeedList.tsx` (`FEED_FILTERS`), puramente front-end (o dado/backend já existia).
- [ ] Filtro "Desafios/Progresso" no feed — não implementado; hoje não há posts reais do tipo `CHALLENGE` sendo gerados (renderização existe, criação não), então um filtro para esse tipo ainda não teria conteúdo.
- [x] Silenciar tipos de conteúdo — **Implementado em 2026-08-27**: novo model `UserContentMute` (`userId + postType`), `GET/POST /api/community/content-mutes`, `DELETE /api/community/content-mutes/[postType]`, aplicado na exclusão do feed (`app/api/community/feed/route.ts`). Preferência persistente de verdade, não só "não tenho interesse" por post individual. UI em `/community/privacy`.
- [x] Ocultar atividade de um usuário específico sem bloquear — **Implementado em 2026-08-27**: novo model `UserFeedMute` (unidirecional, diferente de `CommunityBlock`), `GET/POST /api/community/feed-mutes`, `DELETE /api/community/feed-mutes/[userId]`, botão "Ocultar publicações deste usuário" no menu de cada post (`PostCard.tsx`), lista de silenciados com opção de reativar em `/community/privacy`.

---

# 29 (parcial) — Privacidade, tela central

**Implementado em 2026-08-27.** As regras já eram aplicadas em todo o app
(XP/streak/conquistas mostrar/ocultar via `SocialProfile`; atividade/
progresso privados por padrão; apps conectados com desconexão e última
sincronização visíveis) — mas nenhuma UI permitia mudar os 4 toggles de
privacidade, que ficavam sempre no default (`true`). Agora existe:

- [x] Uma tela única "Privacidade" (`app/community/privacy/page.tsx`, linkada em Perfil → Configurações) reunindo os 4 toggles de privacidade social, as 7 preferências de notificação (seção 31) e o gerenciamento de mutes (seção 28 acima). Backend reaproveitado 100% (`PATCH /api/community/me` já aceitava esses campos, só não tinha UI). Persistência verificada ao vivo (reload real após alternar um toggle).

---

# 32 (parcial) — Moderação, proteção restante

- [x] Rate limiting em denúncias/posts/comentários — ver seção 32 principal acima (`lib/community/rate-limit.ts`), implementado em 2026-08-27.
- [ ] Proteção contra spam (além do rate limiting) — não implementado.

---

# 62. Correção — Foto de perfil Google × personalizada

> **2026-08-25**. Bug reportado: usuários que entram via Google e depois
> trocam a foto pelo Perfil do SmartPlate veem a foto nova sumir/voltar pra
> antiga. Investigado e corrigido nesta sessão.

## Comportamento anterior / causa raiz

- [x] **Confirmado por auditoria de código, não suposição**: `SocialProfile.avatarUrl` era um único campo ambíguo. `ensureSocialProfile` (`lib/community/social-profile.ts`) gravava nele, uma única vez, a foto do Clerk no momento da criação do perfil (que na prática é sempre a foto do provedor OAuth, já que é o primeiro acesso).
- [x] O upload de foto personalizada (`EditProfileModal.tsx`, `OnboardingWizard.tsx`) já funcionava corretamente do lado do Clerk (`user.setProfileImage`) — o arquivo era de fato enviado e hospedado em `img.clerk.com`.
- [x] **Causa raiz real**: depois do upload, o app chamava `PATCH /api/community/me` com `{ avatarUrl: ... }` pra persistir a nova foto — mas `updateSocialProfileSchema` (`lib/community/validation.ts`) nunca teve nenhum campo de avatar. Zod remove chaves desconhecidas de um `z.object()` por padrão, então o campo era descartado silenciosamente antes de chegar no `prisma.socialProfile.update`. A chamada retornava sucesso (nenhum erro em lugar nenhum), mas o banco nunca era atualizado.
- [x] Resultado visível: a foto nova aparecia só onde o componente lia `user.imageUrl` do Clerk ao vivo (ex.: dentro do próprio modal, num instante); em todo o resto do app — cabeçalho, feed, comentários, amizades, membros de grupo, ranking — a leitura vinha do banco (`SocialProfile.avatarUrl`), que nunca mudava, então a foto antiga (a do Google, capturada uma vez no cadastro) continuava aparecendo pra sempre.
- [x] Não era um problema de sincronização ativa "Google sobrescrevendo a personalizada" (não existe nenhum webhook `user.updated` no projeto — confirmado, zero ocorrências) — era simplesmente a foto personalizada nunca chegando a ser persistida.
- [x] **Evidência direta em produção**: antes da correção, das 7 contas reais existentes, nenhuma tinha um valor persistido que pudesse ter vindo de um upload bem-sucedido (consistente com o bug estar presente desde sempre nesse fluxo).

## Fonte canônica e regra de precedência

- [x] Clerk continua sendo o storage real do arquivo de imagem (upload, hospedagem, CDN) — decisão deliberada de não duplicar isso com um bucket próprio, já que o upload em si já funcionava corretamente.
- [x] `SocialProfile.avatarUrl` (ambíguo) foi dividido em dois campos explícitos: `customAvatarUrl` (aponta pro storage do Clerk, só setado por upload feito no SmartPlate) e `providerAvatarUrl` (foto do provedor OAuth, capturada de `externalAccounts[].imageUrl` do Clerk — nunca de `user.imageUrl`, que já reflete a foto personalizada depois de um upload).
- [x] Regra única, centralizada em `lib/community/avatar.ts`: `resolveAvatarUrl = customAvatarUrl ?? providerAvatarUrl ?? null`. Reaproveitada em toda leitura (perfil, cabeçalho, feed, comentários, amizades, grupos, ranking, conquistas) — nenhum componente tem sua própria expressão de precedência.
- [x] `pickProviderAvatarUrl` nunca é derivado de `user.imageUrl` (que muda pra a foto personalizada depois de um `setProfileImage`) — sempre das contas externas reais, que o Clerk nunca sobrescreve.
- [x] Upload valida no backend que a URL recebida é realmente do Clerk (`isTrustedClerkImageUrl`, checa o hostname `img.clerk.com`) — nunca aceita uma URL arbitrária enviada pelo cliente.
- [x] Remover a foto personalizada (`customAvatarUrl: null`) restaura o fallback do provedor imediatamente, sem esperar nenhuma sincronização.

## Arquivos alterados/criados

- **Novo**: `lib/community/avatar.ts` (`resolveAvatarUrl`, `pickProviderAvatarUrl`, `isTrustedClerkImageUrl`, `publicIdentitySelect`/`toPublicIdentity`), `components/social/Avatar.tsx` (avatar de lista compartilhado, com fallback seguro em `onError`).
- **Schema**: `prisma/schema.prisma` (`SocialProfile.avatarUrl` → `customAvatarUrl` + `providerAvatarUrl`).
- **Escrita**: `lib/community/social-profile.ts` (criação), `app/api/community/me/route.ts` (PATCH — correção da causa raiz + refresh de `providerAvatarUrl` só quando o avatar é tocado), `lib/community/validation.ts` (campo `customAvatarUrl` validado).
- **Leitura**: `app/api/community/{users/search,friends,groups/[id]/members,posts/[id]/comments,challenges/[id]/ranking}/route.ts`, `lib/community/{feed-items,gamification,achievement-engine}.ts` — todos migrados do `select` bruto pro `publicIdentitySelect`/`resolveAvatarUrl` centralizado.
- **Interface**: `EditProfileModal.tsx` (upload usa a URL retornada por `setProfileImage` em vez de `user.imageUrl` pós-`reload()`; botão "Remover" adicionado; preview passa a usar o valor resolvido do banco, não mais `user.imageUrl`), `OnboardingWizard.tsx` (mesma correção de upload; preview continua em `user.imageUrl` só nesse fluxo porque o `SocialProfile` ainda não existe nesse momento), `AppSidebar.tsx`/`app/profile/page.tsx` (removida a expressão ad-hoc `dbValue || user.imageUrl`), `components/social/{FriendsPanel,PostCard,CommentSection,GroupMembersPanel,LeaderboardCard,SocialFeed,ChallengeRankingModal,PostComposer,PostComposerModal}.tsx` (unificados no componente `Avatar` compartilhado).
- **Config**: `next.config.ts` (adicionado `lh3.googleusercontent.com` aos `remotePatterns`, defensivamente, caso `providerAvatarUrl` não venha proxiada pelo Clerk).

## Migration

- [x] `prisma/migrations/20260825140000_split_avatar_sources/` — aditiva com backfill: adiciona `customAvatarUrl`/`providerAvatarUrl`, copia todo valor existente de `avatarUrl` para `providerAvatarUrl` (seguro porque, pela causa raiz confirmada, nenhum valor existente podia ser uma foto personalizada de verdade), só então remove a coluna antiga. Aplicada com o mesmo workflow seguro de sempre (`db execute` + `migrate resolve`, nunca `db push`). `prisma migrate status` confirma "up to date" (18 migrations).
- [x] Verificado depois de aplicar: as 7 contas reais existentes têm `providerAvatarUrl` preenchido e `customAvatarUrl` vazio — confirma a causa raiz (nenhuma foto personalizada tinha sobrevivido até então).

## Armazenamento

- [x] Foto personalizada: Clerk (subdomínio de `clerk.com`, ex.: `img.clerk.com`/`images.clerk.com`), via `user.setProfileImage`/`user.setProfileImage({file: null})` pra remover. Nenhum bucket próprio introduzido — decisão deliberada dado que o upload do Clerk já era seguro e funcional.
- [x] Banco (`SocialProfile`) guarda só a URL permanente retornada pelo Clerk, nunca base64, nunca um diretório local.
- [x] **Confirmado 2026-08-25 (decisão explícita do usuário)**: avaliada a migração da foto de perfil pro Vercel Blob (já usado por Antes&Depois/posts/compartilhamento externo) e **rejeitada deliberadamente**. Motivo: Antes&Depois usa Blob **privado** com proxy autenticado por design (conteúdo é privado por padrão) — esse é o padrão errado pra um avatar, que é público por natureza e precisa renderizar instantaneamente em dezenas de lugares (feed, comentários, amizades, grupos, ranking) sem round-trip de servidor por imagem. Fazer certo pra avatar exigiria um padrão de Blob **público** novo (não reaproveitar o privado existente), mais uma rota de upload própria, validação de conteúdo, e limpeza de blob órfão ao trocar de foto — trabalho novo real sem resolver nenhum problema que o Clerk não resolva hoje. O bug desta sessão (hostname incorreto na validação) era um erro de configuração pontual, já corrigido de forma robusta (aceita qualquer subdomínio `*.clerk.com`/`*.clerk.dev`), não evidência de que a arquitetura Clerk estivesse errada. **Não é um item pendente — decisão fechada.**
- [x] **Corrigido 2026-08-25**: `isTrustedClerkImageUrl` e `next.config.ts` assumiam o hostname exato `img.clerk.com` (chute a partir de conhecimento geral, não documentação oficial confirmada) — causava rejeição real de uploads legítimos (`erro ao atualizar a foto` / `dados inválidos`) sempre que o Clerk retornava a imagem num subdomínio diferente (ex.: `images.clerk.com`, confirmado via busca na documentação). Ambos agora aceitam qualquer subdomínio de `clerk.com`/`clerk.dev`.

## Testes executados

- [x] **22 testes novos, automatizados, todos passando** (`tests/avatar/resolve.test.ts`, `tests/avatar/sync.test.ts`): precedência custom > provider > null; remoção restaura o fallback; `isTrustedClerkImageUrl` rejeita domínio arbitrário/similar/esquema não-http; `pickProviderAvatarUrl` prioriza Google e nunca usa `user.imageUrl`; persistência sobrevive a nova leitura (equivalente a reload/novo login); sincronização do provedor nunca sobrescreve a personalizada; segunda foto substitui a primeira; isolamento entre contas (uma nunca afeta a outra); mesma serialização usada por todas as telas.
- [x] Suíte completa (`npm test`): **89/89 testes passando** (67 de hidratação/Beta desta mesma sessão + 22 novos), banco limpo antes/depois (fixtures sintéticas `test-*`, sempre removidas).
- [ ] **Não testado automaticamente** (limitação de ambiente, não de escopo): fluxo completo via `ensureSocialProfile`/rota HTTP com sessão Clerk real (a função chama `currentUser()`, que exige uma sessão autenticada de verdade) — coberto indiretamente testando a mesma operação de banco que a rota executa, e verificado ao vivo que a rota responde corretamente (não quebra) sem sessão.

## QA manual

- [ ] **Não executado nesta sessão — bloqueado por ambiente**: não há navegador/ferramenta de automação de UI disponível. O roteiro de 8 passos (conta Google real → trocar foto → navegar → recarregar → logout/login → conferir em posts/comentários → remover → confirmar volta pro Google) fica pendente de validação manual por alguém com acesso a uma conta Google de teste e um navegador. Compensado parcialmente por: build de produção bem-sucedido, servidor de dev respondendo corretamente às rotas afetadas, e os 22 testes automatizados cobrindo a lógica de persistência/precedência que é exatamente a causa raiz do bug original.

## Lint / typecheck / build

- [x] `npx tsc --noEmit`: 0 erros.
- [x] `next lint`: 0 warnings novos em qualquer arquivo desta correção (avisos remanescentes são todos pré-existentes, em arquivos não tocados).
- [x] `npm run build`: sucesso, todas as rotas presentes no manifesto.

## Pendências

1. QA manual em navegador com conta Google real (ver acima) — sem isso, o item "validado end-to-end com usuário real" não pode ser marcado como concluído, só "implementado e testado automaticamente".
2. Não foi criado um webhook `user.updated` do Clerk para manter `providerAvatarUrl` sempre em dia em tempo real — decisão deliberada (nenhum webhook existe hoje no projeto, adicionar um exigiria segredo de verificação e nova rota pública; fora do escopo mínimo necessário para corrigir o bug). `providerAvatarUrl` é atualizado de forma correta e suficiente sempre que o próprio usuário mexe na foto (upload ou remoção); não é atualizado proativamente se só a foto no Google mudar sem nenhuma ação no SmartPlate.

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

A seção de Antes & Depois permanece privada por padrão — `ProgressPhoto`
nunca é exposto diretamente à Comunidade.

- [x] Botão explícito `Compartilhar progresso` — **Implementado em 2026-08-27**, em `ProgressPhotoHistoryModal.tsx`.
- [x] Escolher quais informações mostrar — checkbox "mostrar peso" em `ShareProgressPhotoModal.tsx` (a foto em si já está escolhida ao clicar "Compartilhar" naquela linha do histórico).
- [x] Ocultar peso por padrão — checkbox começa desmarcado.
- [x] Permitir legenda — campo de texto padrão do Composer.
- [x] Compartilhar na comunidade geral ou em grupo — reaproveita o seletor de destino já existente no Composer.
- [x] Nunca publicar automaticamente — sempre passa pelo Composer, com aviso explícito no picker.
- **Arquitetura**: novo `PostType.PROGRESS_SHARE` + `lib/storage/blob.ts::copyPrivateImage` — o post recebe uma CÓPIA do blob privado (novo pathname, mesmo dono), nunca uma referência viva ao `ProgressPhoto` original; `ProgressPhoto` continua podendo ser editado/excluído sem afetar o post já publicado. **Não testado ao vivo** neste ambiente (sem `BLOB_READ_WRITE_TOKEN` local — mesma limitação já documentada para outras rotas de imagem) — validado até a criação do attachment; a cópia do blob em si depende de verificação em produção/preview.

---

# 23. Compartilhamento de refeições (refinamento)

`PostType.PLAN_SHARE` já permite compartilhar um **plano** inteiro (Parte 1,
seção 12 do checklist de hashtags/feed).

- [x] Compartilhar uma refeição específica (não o plano inteiro) — **Implementado em 2026-08-27**, com uma ressalva de arquitetura: o dashboard do Plano Semanal identifica refeições por `(dia, tipo, índice do lanche)`, não por um `Meal.id` estável navegável pelo cliente — então o compartilhamento é um **snapshot** (nome + macros no momento do clique), não uma referência viva a um registro. Botão "Compartilhar" em cada refeição (`meal-plan-dashboard.tsx`) → `ShareMealModal.tsx` → reaproveita `PostType.PLAN_SHARE` com metadata estendida (`mealName`, macros opcionais). Verificado ao vivo, publicação real renderizada corretamente no feed.
- [ ] Compartilhar receita isoladamente (ingredientes) — não implementado; o snapshot atual leva nome + macros, não a lista de ingredientes.
- [x] Compartilhar refeição favorita — coberto pelo mesmo botão acima (funciona para qualquer refeição, favoritada ou não).
- [x] Mostrar nome e macros apenas se o usuário quiser — checkbox "Mostrar calorias e macros na publicação", desmarcado por padrão.

---

# 30. Notificações sociais (restante)

Já existia notificação real de desafio concluído (`Notification` model).
**Em 2026-08-27**, `lib/community/notify.ts::notifyIfEnabled` passou a ser o
ponto único de criação (respeita a preferência de categoria — seção 31) e
os seguintes gatilhos reais foram adicionados:

- [x] Nova solicitação de amizade — `app/api/community/friends/route.ts`
- [x] Amizade aceita — `app/api/community/friends/[id]/route.ts`
- [x] Comentário / reação recebidos — `app/api/community/posts/[id]/comments/route.ts` e `.../reactions/route.ts` (nunca notifica o próprio autor)
- [x] Convite para grupo — precisou de uma feature de suporte nova (convite direcionado a um usuário específico, model `GroupInvite`, distinto do código compartilhável de `CommunityGroup.inviteCode`): `POST /api/community/groups/[id]/invite-user` (só OWNER/ADMIN), `GET /api/community/group-invites`, `PATCH /api/community/group-invites/[id]` (aceitar/recusar), botão "Convidar membro" em `GroupMembersPanel.tsx`, aceitar/recusar inline no sino de notificações (mesmo padrão já usado para solicitação de amizade)
- [x] Desafio iniciado — só para desafios de **grupo** (notifica os demais membros na criação); desafios `GLOBAL` ficam de fora deliberadamente (seria um broadcast para toda a base, escopo maior que uma notificação social)
- [x] Conquista desbloqueada — `lib/community/achievement-engine.ts::unlockAchievement`
- [ ] Streak em risco — **deliberadamente não implementado**: só teria valor real como notificação proativa (cron/push), infraestrutura inexistente hoje (sem Vercel Cron configurado, sem Web Push). Decisão de produto pendente, documentada, não uma omissão.
- [x] Meta semanal atingida — `lib/activity/goals.ts::checkActivityGoalCompletions`, só na primeira vez que a meta é batida na semana (idempotente)

---

# 31. Configuração de notificações

**Implementado em 2026-08-27.** Não foram adicionados toggles falsos: as 7
colunas booleanas (`SocialProfile.notify*`) são reais e persistidas, e a UI
em `/community/privacy` já funciona de ponta a ponta (verificado ao vivo,
com reload real confirmando persistência).

- [x] Social, Refeições, Atividades, Desafios, Sequência, Progresso, Lembretes — cada categoria configurável e persistida. **Importante**: só Social, Atividades (meta semanal) e Progresso (conquista) têm um gatilho real hoje (seção 30) — Refeições, Desafios, Sequência e Lembretes já têm o toggle funcional, mas nenhuma notificação real associada ainda. Isso é intencional (preparado para gatilhos futuros), não uma promessa de algo já funcionando — ver seção 30 para o que de fato dispara notificação hoje.

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

- [x] Área administrativa protegida com totais de códigos (criados/disponíveis/usados/desativados/expirados), data de resgate, usuário associado
- [x] Permitir desativar código não utilizado, criar novo lote, escolher duração/`redeemUntil`
- [x] Nunca exibir código puro depois da geração
- [x] Permitir revogar `PremiumGrant` administrativamente, com auditoria

**Implementado em 2026-08-26** (`/admin`, `/admin/beta`, `/admin/premium`):

- Autorização server-side centralizada em `lib/admin/authz.ts::requireAdmin()` — reaproveita `ProfileRole.ADMIN`/`getProfileRole` já existentes em `lib/community/authz.ts` (mesmo papel usado pela moderação), sem criar um segundo sistema de roles. Guarda dupla: `app/admin/layout.tsx` (Server Component, redireciona quem não é ADMIN) + toda rota `app/api/admin/**` chama `requireAdmin` de novo — nunca confia só na UI.
- Status do `BetaCode` (`AVAILABLE`/`REDEEMED`/`DISABLED`/`EXPIRED`) é 100% derivado por `lib/beta/status.ts::getBetaCodeStatus()` — nenhum enum novo no banco.
- Migration aditiva `20260826120000_add_admin_panel_beta_premium_audit`: `BetaCode` ganhou `batchId`/`createdByUserId`/`disabledAt`/`disabledByUserId`; `PremiumGrant` ganhou `revokedByUserId`/`revokedReason` (o campo `revokedAt` já existia mas nunca era escrito); nenhuma coluna existente foi alterada/removida.
- Novo model `AuditLog` — mesmo schema já especificado em `SMARTPLATE_PARCEIROS_ACADEMIAS_IMPLEMENTACAO.md` (seção 76), reaproveitado em vez de criar um `AdminAuditLog` paralelo. Ações registradas hoje: `BETA_BATCH_CREATED`, `BETA_CODE_DISABLED`, `PREMIUM_GRANT_REVOKED` (nunca guarda código Beta em texto puro no metadata).
- Criação de lote reaproveita `lib/beta/codes.ts` (mesma geração/hash usada por `scripts/generate-beta-codes.cjs`) — os códigos em texto puro só existem na resposta HTTP da criação; fechar a tela de resultado os torna irrecuperáveis (não existe rota/query administrativa que os devolva depois).
- Revogar um `PremiumGrant` de origem Beta nunca mexe em `Profile.subscriptionActive`/Stripe — `resolvePremiumAccess` (`lib/premium/access.ts`) já ignora grants com `revokedAt` preenchido; verificado por teste automatizado (não só por inspeção).
- Cobertura de teste nova: `tests/admin/{authz,beta-status,beta-admin,premium-admin}.test.ts` (27 testes) — inclui concorrência (duas desativações simultâneas do mesmo código só uma vence) e o caso “revogar Beta não cancela Stripe”. Suite completa do projeto: 127/127 passando.
- Verificado ao vivo via Playwright contra o banco real (dashboard, criação de lote, desativação, listagem de Premium Grants reais) — não apenas testes automatizados.
- **Não implementado nesta rodada** (ver seção 46): geração de `PremiumGrant` administrativo manual (`source: "ADMIN"`, enum já existe mas nada ainda o usa), filtros avançados de busca por usuário na tela de Beta, RBAC granular (continua só `ProfileRole.ADMIN`, ver seção 12 do `SMARTPLATE_DECISOES_POS_ARQUITETURA_ACADEMIAS.md`).

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

A raridade já existia no código (`AchievementRarity`, usada pro cálculo de
XP) — **Implementado em 2026-08-27**: exposta na UI.

- [x] Mostrar selo/cor de raridade nos cards de conquista — `AchievementsModal.tsx` (grade e detalhe), badge com texto (Comum/Incomum/Rara/Épica/Especial) + cor, nunca só cor. `rarity` já vinha de graça na resposta de `GET /api/achievements` (herdado de `AchievementDefinition`) — não precisou mudar o backend. Verificado ao vivo. **Não** adicionado ao card compacto de `AchievementsSummaryCard.tsx` (grade muito pequena para o badge) nem ao card de conquista compartilhada no feed (`PostCard.tsx` ACHIEVEMENT) — ver seção 56.

---

# XP de hoje — breakdown diário no Dashboard

**Implementado em 2026-08-27.** `getXpBreakdown()` já existia (soma
vitalícia por fonte ampla). Nova função `getXpEventsToday()` (mesmo
arquivo) agrupa por `eventType` (ação específica, não fonte ampla) filtrado
ao dia local do usuário — mesmo padrão de precisão de dia local já usado em
`lib/hydration/stats.ts`.

- [x] Card "XP de hoje" no Início, com breakdown por ação do dia — `components/XpTodayCard.tsx`, alimentado por `xpToday` (novo campo em `GET /api/community/gamification`). Mostra rótulo amigável por tipo (ex.: "Refeição concluída", "Meta de água batida") com contagem quando repete no mesmo dia. De quebra, corrigido `WATER_GOAL_COMPLETED`/`ACTIVITY_GOAL_MET`, que não tinham entrada no mapa de categorização de `getXpBreakdown` (vitalício) e caíam incorretamente em "ACTIVITY" — sem efeito prático até agora porque `WATER_GOAL_COMPLETED` sempre concede 0 XP, mas o breakdown vitalício agora reflete a fonte certa. Verificado ao vivo (estado vazio correto: "Nenhum XP ganho ainda hoje").
