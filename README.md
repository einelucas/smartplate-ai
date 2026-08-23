<div align="center">

<img src="./public/logo.png" alt="SmartPlate AI" width="120" />

# SmartPlate AI

**SaaS de planejamento alimentar que combina preferências do usuário, acompanhamento de peso e inteligência artificial para gerar planos semanais e listas de compras.**

<img src="https://skillicons.dev/icons?i=ts,nextjs,react,tailwind,postgres,prisma,vercel&theme=dark" alt="TypeScript, Next.js, React, Tailwind CSS, PostgreSQL, Prisma e Vercel" />

</div>

## Sobre o projeto

O SmartPlate AI permite que o usuário registre seus dados físicos, objetivo, preferências alimentares e nível de experiência na cozinha. A aplicação utiliza essas informações para gerar um plano alimentar de sete dias com refeições, calorias, macronutrientes, tempo de preparo e dificuldade.

Além da geração do plano, o sistema mantém histórico, cria listas de compras, acompanha a evolução de peso e controla assinaturas recorrentes.

> Os conteúdos gerados são informativos e não substituem avaliação ou acompanhamento de nutricionista ou outro profissional de saúde.

## Funcionalidades

- Cadastro, login e gerenciamento de sessão com Clerk
- Perfil com altura, peso inicial, peso atual, meta e tipo de dieta
- Preferências de alimentos, restrições, objetivo, orçamento e tempo de preparo
- Geração de plano alimentar completo para sete dias
- Café da manhã, almoço, jantar e lanches por dia
- Informações de calorias, proteínas, carboidratos e gorduras
- Salvamento, exclusão, favoritos e compartilhamento de planos
- Lista de compras agrupada por categoria e gerada a partir do plano
- Registro de peso com histórico e gráficos de evolução
- Assinaturas semanal, mensal e anual com Stripe Checkout
- Webhooks para ativação, falha de pagamento e cancelamento
- Proteção das áreas de plano e perfil conforme autenticação e assinatura
- Comunidade real com feed, amigos, grupos, desafios, ranking semanal e gamificação (streak/XP/conquistas)
- Moderação de conteúdo gerado por usuários (denúncias, bloqueios, painel de moderação)

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Aplicação | Next.js 15, React 19 e TypeScript |
| Interface | Tailwind CSS, Framer Motion, Lucide, Recharts e Chart.js |
| Estado assíncrono | TanStack React Query |
| Validação | Zod |
| Autenticação | Clerk |
| Inteligência artificial | OpenRouter por meio do SDK compatível da OpenAI |
| Dados | PostgreSQL e Prisma ORM |
| Pagamentos | Stripe Checkout e Stripe Webhooks |

## Fluxo principal

```mermaid
flowchart LR
    A[Perfil e preferências] --> B[API do SmartPlate]
    B --> C[Modelo via OpenRouter]
    C --> D[Plano de 7 dias]
    D --> E[Salvar e favoritar]
    D --> F[Lista de compras]
    D --> G[Acompanhamento]
```

## Estrutura

```text
app/
├── api/
│   ├── community/           # Feed, amigos, grupos, desafios, ranking, moderação
│   └── ...                  # IA, planos, perfil, peso e Stripe
├── community/                # Comunidade geral, grupos, convite, regras, moderação
├── mealplan/                 # Painel de planejamento alimentar
├── profile/                  # Perfil e evolução do usuário
├── shared/[token]/            # Leitura pública de plano compartilhado
├── sign-up/                  # Cadastro com Clerk
└── subscribe/                 # Escolha de assinatura
components/
├── social/                   # Feed, posts, grupos, amigos, moderação
└── ...                       # Dashboard, lista de compras e gráficos
hooks/                        # Consultas e mutações com React Query (useCommunity, useMealPlan, ...)
lib/
├── community/                # Gamificação, validação (Zod), autorização, convites
└── ...                       # Prisma, Stripe, planos e helpers
prisma/                       # Schema e migrations PostgreSQL
types/                        # Tipos compartilhados (incluindo types/community.ts)
```

## Como executar

### Requisitos

- Node.js 20 ou superior
- npm
- Banco PostgreSQL
- Conta no Clerk
- Chave da OpenRouter
- Conta e produtos configurados no Stripe

### Instalação

```bash
git clone https://github.com/einelucas/smartplate-ai.git
cd smartplate-ai
npm install
```

Crie `.env.local` na raiz:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/smartplate"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

OPENROUTER_API_KEY="sk-or-..."

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_WEEKLY="price_..."
STRIPE_PRICE_MONTHLY="price_..."
STRIPE_PRICE_YEARLY="price_..."

NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

Prepare o banco e inicie a aplicação:

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Webhook do Stripe em desenvolvimento

Com o Stripe CLI autenticado:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Copie o segredo retornado para `STRIPE_WEBHOOK_SECRET`. Os preços configurados no Stripe devem corresponder às variáveis semanal, mensal e anual.

## Comunidade e gamificação

Área social do SmartPlate AI, com dois espaços — **Geral** (comunidade aberta) e **Meus Grupos** (grupos privados) — voltados para consistência e hábitos, nunca para peso, calorias ou emagrecimento.

### Streak (sequência)

Cada conclusão real de refeição (`PATCH /api/meal-plans/[id]/meals`, quando `completed` passa de `false` para `true`) é a ação elegível do MVP. A data usada é a **data local do usuário** (`SocialProfile.timezone`, padrão UTC), nunca UTC puro nem `DayPlan.day` (que é só o nome do dia da semana, não uma data). Um dia consecutivo ao último dia qualificado incrementa `currentStreak`; um intervalo maior reseta para 1; `longestStreak` nunca diminui.

### XP

+10 XP por conclusão de refeição, XP definido pelo desafio ao completá-lo. Todo XP é registrado em `XpEvent`, um ledger imutável com `idempotencyKey` único (ex.: `meal_complete:{planId}:{mealType}:{snackIndex}:{data-local}`) — marcar/desmarcar a mesma refeição repetidamente nunca gera XP duplicado. Nunca há XP por abrir o app, perder peso ou déficit calórico.

### Níveis e conquistas

Nível calculado por thresholds simples (`lib/community/achievements.ts`): 0 / 250 / 750 / 1500 / 3000 XP → níveis 1–5. Conquistas (`UserAchievement`) são definidas em código: `FIRST_ACTION`, `STREAK_3/7/14/30`, `XP_100/500/1000`, `FIRST_CHALLENGE`, `FIRST_GROUP`. Desbloqueios geram um toast local discreto com opção de "Compartilhar" — nunca publicação automática.

### Ranking

Calculado a partir da soma de `XpEvent` na semana corrente (segunda 00:00 UTC → domingo 23:59 UTC), nunca a partir de `totalXp`. Disponível como geral (`GET /api/community/ranking?scope=global`) ou por grupo (`?scope=group&groupId=`, com checagem de membership no servidor).

### Amigos

Solicitação, aceite, recusa, cancelamento e remoção via `Friendship`, com par de usuários normalizado (`userAId`/`userBId` ordenados) para impedir duplicidade A→B/B→A. Busca apenas por username (nunca e-mail). Bloqueio (`CommunityBlock`) remove qualquer amizade existente e oculta o usuário de feed, busca e sugestões nos dois sentidos.

### Grupos

`CommunityGroup` + `GroupMember` (papéis `OWNER`/`ADMIN`/`MEMBER`), com feed, ranking e desafios próprios. Convite por código (`/community/invite/{code}`, página pública que preserva o código através do login) ou link direto. O dono não pode sair sem transferir a propriedade ou excluir o grupo. Todas as permissões são checadas no servidor.

### Desafios

`Challenge` (`GLOBAL`, só moderação, ou `GROUP`, qualquer membro) + `ChallengeParticipant`, com métricas `ACTIVE_DAYS`, `MEAL_COMPLETIONS` e `STREAK_DAYS`. O progresso é sempre recalculado no servidor a partir da atividade real — o frontend nunca informa progresso.

### Feed, posts e moderação

Posts (`CommunityPost`: `TEXT`, `ACHIEVEMENT`, `STREAK`, `CHALLENGE`, `PLAN_SHARE`), reações (`CommunityReaction`, uma por tipo por usuário) e comentários (`CommunityComment`) com paginação por cursor. `PLAN_SHARE` reaproveita `SharedPlan`/`POST /api/meal-plans/[id]/share` (com página de leitura pública em `/shared/[token]`), validando que o plano pertence a quem publica. Antes do primeiro post/comentário, o usuário aceita as Regras da Comunidade (`/community/rules`). Denúncias (`ContentReport`) cobrem posts, comentários e usuários; `Profile.role` (`USER`/`MODERATOR`/`ADMIN`) controla acesso ao painel `/community/moderation`, onde é possível ocultar posts, excluir comentários e resolver denúncias.

### Limitações conhecidas (próxima fase)

- Ranking semanal usa uma janela UTC única para todos os usuários (não ajustada por timezone individual).
- `DayPlan.completed` não reseta diariamente — planos totalmente concluídos podem pausar novas transições de streak até gerar um novo plano.
- Sem chat privado, stories, feed algorítmico ou ligas — fora de escopo do MVP.

## Principais modelos de dados

- `Profile`: conta, assinatura, dados físicos e `role` (USER/MODERATOR/ADMIN)
- `UserPreferences`: preferências e objetivo alimentar
- `MealPlan` e `DayPlan`: plano e dias da semana
- `Meal`, `Ingredient` e `NutritionalInfo`: refeições e dados nutricionais
- `ShoppingList`: listas geradas por plano
- `WeightLog`: histórico de peso
- `SharedPlan`: compartilhamento por token
- `SocialProfile`: perfil público da Comunidade (username, avatar, bio, privacidade)
- `UserGamification`, `XpEvent`, `DailyActivity`, `UserAchievement`: XP, streak e conquistas
- `Friendship` e `CommunityBlock`: amizades e bloqueios
- `CommunityGroup` e `GroupMember`: grupos e papéis
- `Challenge` e `ChallengeParticipant`: desafios e progresso
- `CommunityPost`, `CommunityReaction` e `CommunityComment`: feed
- `ContentReport`: denúncias e moderação

## Status

Projeto em evolução. Entre as melhorias previstas estão validação mais rígida das respostas da IA, testes automatizados, revisão dos cálculos nutricionais e aprimoramento das rotas de compartilhamento.
