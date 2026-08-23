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

---

# 1. Atividades físicas

## P0 — Estrutura base

- [ ] Criar entidade `ActivityLog`
- [ ] Relacionar `ActivityLog` ao usuário/Profile
- [ ] Permitir registrar atividade manualmente
- [ ] Salvar data/hora da atividade
- [ ] Salvar tipo da atividade
- [ ] Salvar duração
- [ ] Salvar intensidade
- [ ] Salvar observação opcional
- [ ] Permitir distância opcional
- [ ] Criar histórico de atividades
- [ ] Permitir editar atividade
- [ ] Permitir excluir atividade
- [ ] Criar validação backend com Zod
- [ ] Garantir que atividades sejam privadas por padrão

## Tipos iniciais de atividade

- [ ] Caminhada
- [ ] Corrida
- [ ] Ciclismo
- [ ] Musculação
- [ ] Natação
- [ ] Futebol
- [ ] Esportes
- [ ] Yoga
- [ ] Mobilidade
- [ ] HIIT
- [ ] Outra atividade personalizada

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

- [ ] Adicionar ação rápida `Registrar atividade`
- [ ] Mostrar resumo de atividade recente
- [ ] Mostrar minutos ativos da semana
- [ ] Mostrar quantidade de atividades no período

## Comunidade

- [ ] Adicionar opção `Registrar atividade`
- [ ] Permitir registrar e decidir se deseja compartilhar
- [ ] Permitir compartilhar uma atividade registrada anteriormente

## Perfil

- [ ] Mostrar resumo de atividades
- [ ] Exibir quantidade de atividades no mês
- [ ] Exibir minutos ativos
- [ ] Adicionar acesso ao histórico
- [ ] Mostrar evolução de consistência

---

# 3. Atividades na Comunidade

## Novo tipo de publicação

- [ ] Adicionar `ACTIVITY` em `PostType`

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

- [ ] Compartilhar atividade manualmente
- [ ] Nunca publicar automaticamente
- [ ] Permitir escolher destino

Opções:

- [ ] Não compartilhar
- [ ] Comunidade geral
- [ ] Grupo específico

## Card de atividade

Exibir:

- [ ] Tipo
- [ ] Ícone
- [ ] Duração
- [ ] Distância, quando existir
- [ ] Data
- [ ] Intensidade
- [ ] Observação
- [ ] XP recebido
- [ ] Reações
- [ ] Comentários

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

- [ ] Criar eventos de XP para atividades
- [ ] Usar `XpEvent`
- [ ] Criar `idempotencyKey` para impedir XP duplicado
- [ ] Definir limite diário
- [ ] Não recompensar excessivamente volume/performance

## Possível regra inicial

- [ ] Registrar atividade válida: +10 XP
- [ ] Atividade com 30+ minutos: +5 XP
- [ ] Primeira atividade do dia: +5 XP
- [ ] Concluir desafio: XP bônus
- [ ] Conquista: XP bônus

## Anti-abuso

- [ ] Máximo de XP diário por atividade
- [ ] Duração mínima para receber XP
- [ ] Impedir editar atividade repetidamente para ganhar XP
- [ ] Remover/reverter XP quando necessário
- [ ] Impedir atividades duplicadas vindas de integrações externas

---

# 5. Streak / sequência

Expandir o conceito de sequência do SmartPlate.

## Ações que podem qualificar um dia

- [ ] Completar refeição
- [ ] Registrar atividade física
- [ ] Participar de desafio
- [ ] Registrar progresso
- [ ] Outras ações relevantes no futuro

## Regras

- [ ] Não exigir exercício todos os dias
- [ ] Representar consistência geral no SmartPlate
- [ ] Integrar com `DailyActivity`
- [ ] Garantir timezone correto
- [ ] Evitar dupla contagem de ações

---

# 6. Conquistas

## Atividade física

- [ ] Primeiros Passos — primeira atividade
- [ ] Em Movimento — 10 atividades
- [ ] 50 Atividades
- [ ] 100 Atividades
- [ ] Semana Ativa — atividade em 3 dias da semana
- [ ] Consistência — atividade em várias semanas diferentes
- [ ] 30 Dias em Movimento
- [ ] Explorador — registrar diferentes tipos de atividade

## Alimentação + atividade

- [ ] Rotina Completa — refeição + atividade no mesmo dia
- [ ] Semana Equilibrada — alimentação + atividade em 5 dias
- [ ] Consistência Total
- [ ] Evolução — manter rotina por determinado período

## Progresso

- [ ] Primeira foto de progresso
- [ ] Primeiro registro de peso
- [ ] 10 registros de peso
- [ ] Primeira meta atingida
- [ ] Sequência de registros de progresso

## Social

- [ ] Primeira publicação
- [ ] Primeiro amigo
- [ ] Entrar em primeiro grupo
- [ ] Participar de primeiro desafio
- [ ] Concluir primeiro desafio

---

# 7. Desafios

## Novas métricas

Adicionar futuramente:

```text
ACTIVE_DAYS
ACTIVITY_COUNT
ACTIVITY_MINUTES
MEAL_COMPLETIONS
STREAK_DAYS
```

Possíveis evoluções:

```text
WALKING_DAYS
RUNNING_DAYS
CYCLING_DAYS
STRENGTH_DAYS
BALANCED_DAYS
```

## Exemplos

- [ ] Atividade em 4 dias durante a semana
- [ ] 150 minutos ativos
- [ ] 300 minutos ativos
- [ ] Complete 10 atividades
- [ ] Complete 20 refeições planejadas
- [ ] Mantenha sequência por 7 dias
- [ ] Alimentação + atividade em 5 dias

## Grupos

- [ ] Permitir desafios exclusivos de grupos
- [ ] Ranking interno
- [ ] Progresso individual
- [ ] Progresso coletivo
- [ ] XP de recompensa
- [ ] Notificação ao completar

---

# 8. Ranking

## Ranking principal

- [ ] Continuar baseado em XP
- [ ] Não usar distância como ranking principal
- [ ] Não favorecer um tipo específico de esporte

Fontes de XP:

- [ ] Alimentação
- [ ] Atividade
- [ ] Sequência
- [ ] Conquistas
- [ ] Desafios

## Períodos

- [ ] Semanal
- [ ] Mensal
- [ ] Geral

## Escopo

- [ ] Comunidade geral
- [ ] Amigos
- [ ] Grupo

---

# 9. Connected Apps / Aplicativos conectados

Criar uma arquitetura genérica para integrações externas.

## P1 — Base

- [ ] Criar módulo `Connected Apps`
- [ ] Criar tela de integrações
- [ ] Criar entidade `ConnectedApp`
- [ ] Armazenar provider
- [ ] Armazenar scopes
- [ ] Salvar data de conexão
- [ ] Salvar última sincronização
- [ ] Permitir desconectar integração
- [ ] Proteger tokens
- [ ] Nunca salvar token sensível sem proteção

Modelo conceitual:

```prisma
model ConnectedApp {
  id           String   @id @default(uuid())
  userId       String
  provider     String
  accessToken  String?
  refreshToken String?
  expiresAt    DateTime?
  scopes       String[]
  connectedAt  DateTime @default(now())

  @@unique([userId, provider])
}
```

---

# 10. Fontes externas de ActivityLog

Preparar `ActivityLog.source`.

Valores futuros:

```text
MANUAL
STRAVA
GARMIN
HEALTH_CONNECT
APPLE_HEALTH
SAMSUNG_HEALTH
FITBIT
OTHER
```

- [ ] Impedir duplicidade com `externalId`
- [ ] Identificar origem no histórico privado
- [ ] Não assumir que todas as fontes podem ser compartilhadas socialmente
- [ ] Tratar política de cada provedor separadamente

---

# 11. Integração Strava

## Conta

- [ ] Conectar Strava via OAuth 2.0
- [ ] Gerenciar access token
- [ ] Gerenciar refresh token
- [ ] Renovar tokens automaticamente
- [ ] Permitir desconectar Strava

## Sincronização privada

- [ ] Buscar atividades autorizadas
- [ ] Converter atividade para modelo interno
- [ ] Evitar duplicidades
- [ ] Registrar origem `STRAVA`
- [ ] Mostrar no histórico privado do usuário
- [ ] Implementar sincronização incremental

## Webhooks

- [ ] Receber nova atividade
- [ ] Receber alteração
- [ ] Receber exclusão
- [ ] Atualizar ActivityLog correspondente

## Privacidade

- [ ] Revisar políticas atuais da API antes da implementação
- [ ] Não expor dados externos a terceiros sem permissão/política compatível
- [ ] Separar dados privados sincronizados de conteúdo social

---

# 12. Compartilhamento externo genérico

Criar no composer da Comunidade:

```text
Criar publicação

💬 Texto
🏃 Atividade
🏆 Conquista
🥗 Refeição
⚖️ Progresso
🔗 Compartilhar de outro app
```

## `Compartilhar de outro app`

- [ ] Permitir link fornecido pelo usuário
- [ ] Permitir imagem fornecida pelo usuário
- [ ] Permitir legenda
- [ ] Salvar origem/provedor
- [ ] Mostrar badge da origem
- [ ] Nunca buscar e redistribuir automaticamente dados proibidos pela API externa

Possíveis origens:

- [ ] Strava
- [ ] Garmin
- [ ] Apple Fitness
- [ ] Samsung Health
- [ ] Nike Run Club
- [ ] Adidas Running
- [ ] Outros

---

# 13. Health Connect — Android

## Futuro

- [ ] Pesquisar integração Android Health Connect
- [ ] Ler permissões de atividade autorizadas
- [ ] Importar dados compatíveis
- [ ] Importar passos
- [ ] Importar exercícios
- [ ] Importar distância
- [ ] Importar duração
- [ ] Definir quais dados realmente fazem sentido no SmartPlate
- [ ] Permitir revogar permissões
- [ ] Mostrar fonte do dado

---

# 14. Apple Health / HealthKit — iOS

## Futuro

- [ ] Criar camada específica para iOS
- [ ] Solicitar permissões individualmente
- [ ] Importar atividades autorizadas
- [ ] Importar passos quando fizer sentido
- [ ] Importar treinos
- [ ] Integrar ao mesmo `ActivityLog`
- [ ] Não criar arquitetura paralela ao Android

---

# 15. Garmin

- [ ] Avaliar API/programa oficial disponível na época da implementação
- [ ] Conectar conta
- [ ] Importar atividades permitidas
- [ ] Converter para ActivityLog
- [ ] Respeitar políticas de compartilhamento
- [ ] Evitar duplicidade caso a mesma atividade venha do Strava

---

# 16. Detecção de duplicidade

Importante para múltiplas integrações.

Exemplo:

```text
Garmin
  ↓
Strava
  ↓
SmartPlate
```

Uma mesma corrida pode chegar por mais de uma fonte.

- [ ] Detectar `externalId`
- [ ] Detectar atividades muito semelhantes
- [ ] Evitar XP duplicado
- [ ] Permitir definir uma fonte preferencial
- [ ] Manter origem original quando possível

---

# 17. Dashboard de atividade

## Perfil

- [ ] Atividades do mês
- [ ] Minutos ativos
- [ ] Dias ativos
- [ ] Tipo mais praticado
- [ ] Sequência de atividade
- [ ] Histórico

## Início

- [ ] Resumo semanal
- [ ] Meta semanal
- [ ] Atividade mais recente
- [ ] CTA de registrar atividade

---

# 18. Metas de atividade

Permitir metas pessoais.

- [ ] Dias ativos por semana
- [ ] Minutos ativos por semana
- [ ] Quantidade de atividades
- [ ] Meta customizável
- [ ] Progresso da meta
- [ ] Conquista ao atingir
- [ ] Não transformar meta em obrigação para manter streak geral

---

# 19. Insights privados

Usar dados de atividade para melhorar a experiência pessoal.

- [ ] Detectar semana mais ativa
- [ ] Detectar consistência
- [ ] Resumo semanal
- [ ] Evolução mensal
- [ ] Relacionar atividade e alimentação de forma não invasiva
- [ ] Criar insights privados com IA

Exemplo:

```text
Você esteve ativo em 4 dias esta semana
e completou 82% das refeições planejadas.
```

---

# 20. IA + atividade física

## Futuro

- [ ] IA gerar resumo semanal
- [ ] IA identificar mudanças de rotina
- [ ] IA usar atividade como contexto de personalização
- [ ] IA considerar dias mais ativos no plano
- [ ] IA sugerir organização das refeições em dias de treino
- [ ] Evitar recomendações médicas indevidas
- [ ] Não inferir gasto calórico exato sem fonte confiável

---

# 21. Calendário / Timeline

Criar visão diária unificada.

Exemplo:

```text
23 AGO

08:00  Café da manhã concluído
12:30  Almoço concluído
17:00  🏃 Corrida — 35 min
20:30  Jantar concluído
22:00  ⚖️ Peso registrado
```

- [ ] Refeições
- [ ] Atividades
- [ ] Peso
- [ ] Fotos de progresso
- [ ] Conquistas
- [ ] Desafios

---

# 22. Antes & Depois / progresso social

A seção de Antes & Depois deve permanecer privada por padrão.

Futuro:

- [ ] Botão explícito `Compartilhar progresso`
- [ ] Escolher foto(s)
- [ ] Escolher quais informações mostrar
- [ ] Ocultar peso por padrão
- [ ] Permitir legenda
- [ ] Compartilhar na comunidade geral
- [ ] Compartilhar em grupo
- [ ] Nunca publicar automaticamente

---

# 23. Compartilhamento de refeições

- [ ] Compartilhar refeição concluída
- [ ] Compartilhar receita
- [ ] Compartilhar refeição favorita
- [ ] Mostrar imagem quando disponível
- [ ] Mostrar nome e macros apenas se usuário quiser
- [ ] Permitir comentários e reações

---

# 24. Conquistas compartilháveis

- [ ] CTA `Compartilhar conquista`
- [ ] Criar PostType `ACHIEVEMENT` real
- [ ] Card visual específico
- [ ] Mostrar badge
- [ ] Mostrar data
- [ ] Mostrar descrição
- [ ] Não publicar automaticamente sem consentimento

---

# 25. Streak compartilhável

- [ ] Compartilhar 7 dias
- [ ] Compartilhar 30 dias
- [ ] Compartilhar 100 dias
- [ ] Card especial de milestone
- [ ] Reações
- [ ] Comentários

---

# 26. Grupos de amigos

## Funcionalidades futuras

- [ ] Feed exclusivo
- [ ] Ranking do grupo
- [ ] Desafios privados
- [ ] Convites
- [ ] Código/link de convite
- [ ] Metas coletivas
- [ ] Conquistas do grupo
- [ ] Estatísticas do grupo
- [ ] Moderação
- [ ] Permissões OWNER / ADMIN / MEMBER

---

# 27. Desafios colaborativos

Além de competição individual:

- [ ] Meta coletiva de minutos ativos
- [ ] Meta coletiva de refeições
- [ ] Meta coletiva de dias ativos
- [ ] Barra de progresso do grupo
- [ ] Recompensa para todos os participantes
- [ ] Celebração automática quando concluído

---

# 28. Feed mais inteligente

## Filtros

- [ ] Tudo
- [ ] Amigos
- [ ] Atividades
- [ ] Conquistas
- [ ] Alimentação
- [ ] Progresso
- [ ] Desafios

## Preferências

- [ ] Silenciar tipos de conteúdo
- [ ] Ocultar atividade de determinado usuário
- [ ] Feed cronológico
- [ ] Feed relevante no futuro

---

# 29. Privacidade

Criar uma área central de privacidade.

## SocialProfile

- [ ] Mostrar/ocultar XP
- [ ] Mostrar/ocultar streak
- [ ] Mostrar/ocultar conquistas
- [ ] Perfil descobrível

## Atividade física

- [ ] Privada por padrão
- [ ] Compartilhar caso a caso
- [ ] Futuramente permitir configuração padrão

## Progresso

- [ ] Peso sempre privado por padrão
- [ ] Fotos privadas
- [ ] Meta privada
- [ ] Compartilhamento somente explícito

## Integrações

- [ ] Mostrar apps conectados
- [ ] Permitir desconectar
- [ ] Mostrar última sincronização
- [ ] Informar quais dados são utilizados

---

# 30. Notificações sociais

- [ ] Nova solicitação de amizade
- [ ] Amizade aceita
- [ ] Comentário
- [ ] Reação
- [ ] Convite para grupo
- [ ] Desafio iniciado
- [ ] Desafio concluído
- [ ] Conquista desbloqueada
- [ ] Streak em risco
- [ ] Meta semanal atingida

---

# 31. Configuração de notificações

Quando implementar de verdade:

- [ ] Social
- [ ] Refeições
- [ ] Atividades
- [ ] Desafios
- [ ] Streak
- [ ] Progresso
- [ ] Lembretes

Não adicionar toggles falsos antes de existir persistência.

---

# 32. Moderação

À medida que a Comunidade crescer:

- [ ] Denunciar publicação
- [ ] Denunciar comentário
- [ ] Denunciar usuário
- [ ] Bloquear usuário
- [ ] Moderação administrativa
- [ ] Remover conteúdo
- [ ] Histórico de denúncias
- [ ] Rate limiting
- [ ] Proteção contra spam

---

# 33. Métricas de saúde do produto

Não confundir com dados médicos.

Métricas internas do SmartPlate:

- [ ] Usuários ativos
- [ ] Atividades registradas
- [ ] Refeições concluídas
- [ ] Taxa de adesão
- [ ] Desafios concluídos
- [ ] Posts por semana
- [ ] Retenção
- [ ] Streak médio
- [ ] Uso de grupos
- [ ] Uso de integrações

---

# 34. Arquitetura sugerida

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

Integrações externas:

```text
Strava ───────────────┐
Garmin ───────────────┤
Health Connect ───────┤
Apple Health ─────────┼──> Integration Layer ──> ActivityLog
Samsung Health ───────┤
Manual ───────────────┘
```

---

# 35. Ordem recomendada de implementação

## Fase atual — concluir núcleo

- [ ] Perfil
- [ ] Onboarding
- [ ] Plano Semanal
- [ ] Início / Dashboard
- [ ] Lista de Compras
- [ ] Assinatura
- [ ] Revisão final da Comunidade

## Próxima fase

- [ ] ActivityLog
- [ ] Registro manual de atividade
- [ ] Histórico de atividades
- [ ] Atividade + XP
- [ ] Atividade + streak
- [ ] Conquistas de atividade
- [ ] Compartilhamento de atividade
- [ ] Desafios baseados em atividade

## Depois

- [ ] Dashboard de atividade
- [ ] Metas pessoais
- [ ] Timeline diária
- [ ] Insights
- [ ] Connected Apps

## Integrações

- [ ] Strava
- [ ] Health Connect
- [ ] Apple Health
- [ ] Garmin
- [ ] Outros provedores

## Evolução social

- [ ] Compartilhar refeições
- [ ] Compartilhar progresso
- [ ] Compartilhar conquistas
- [ ] Compartilhar streak
- [ ] Posts de apps externos
- [ ] Desafios colaborativos

---

# 36. Princípios do produto

Manter estes princípios durante as implementações futuras:

- [ ] Dados privados não devem virar conteúdo social automaticamente
- [ ] Compartilhamento deve ser escolha explícita do usuário
- [ ] Não criar métricas falsas
- [ ] Não exibir mocks como se fossem dados reais
- [ ] Não adicionar controles que não persistem
- [ ] SocialProfile contém apenas identidade pública
- [ ] Peso, saúde, fotos e objetivos permanecem privados
- [ ] XP deve recompensar consistência, não comportamento extremo
- [ ] Integrações externas devem respeitar as políticas de cada provedor
- [ ] Dados sincronizados e dados compartilhados são conceitos diferentes
- [ ] Construir funcionalidades reutilizáveis, não fluxos duplicados
- [ ] Preparar o modelo interno para receber novas fontes no futuro

---

# 37. Ideias extras para avaliar posteriormente

- [ ] Medalhas sazonais
- [ ] Eventos da comunidade
- [ ] Desafios oficiais SmartPlate
- [ ] Perfil com vitrine de conquistas
- [ ] Cards compartilháveis em redes sociais
- [ ] Resumo semanal visual
- [ ] Resumo mensal
- [ ] Comparação consigo mesmo
- [ ] Calendário de consistência estilo GitHub
- [ ] Heatmap de atividades
- [ ] Heatmap de refeições concluídas
- [ ] Metas personalizadas
- [ ] Sistema de níveis mais elaborado
- [ ] Títulos de perfil desbloqueáveis
- [ ] Recompensas cosméticas
- [ ] Badges de eventos
- [ ] Reações especiais
- [ ] Comentários com mídia
- [ ] Compartilhamento de receitas
- [ ] Favoritos sociais
- [ ] Sugestões de amigos
- [ ] Convite por link
- [ ] Deep links no app mobile
- [ ] Widgets Android/iOS
- [ ] Push notifications
- [ ] Resumo de atividade no mobile
- [ ] Sincronização em background no app mobile

---

## Observação final

Este arquivo é um backlog de produto.

Não é necessário implementar tudo de uma vez.

A prioridade deve continuar sendo:

> finalizar cada módulo principal com dados reais, estabilidade e boa experiência antes de expandir o SmartPlate com novas integrações e funcionalidades sociais.

---

# 38. Pós-implementação dos Códigos Beta — Validação imediata

> Esta seção deve ser usada assim que o prompt de implementação dos códigos Beta for concluído.
>
> O objetivo aqui é validar a funcionalidade antes de seguir para novas regras de monetização, hidratação ou gamificação.

## 38.1 Banco e migrations

- [ ] Confirmar que uma nova migration foi criada
- [ ] Confirmar que migrations antigas não foram alteradas
- [ ] Confirmar criação do model `BetaCode` ou equivalente
- [ ] Confirmar criação do model `PremiumGrant` ou equivalente
- [ ] Confirmar relacionamento correto com `Profile`
- [ ] Confirmar `codeHash` como `UNIQUE`
- [ ] Confirmar que um mesmo código não pode gerar mais de um grant
- [ ] Confirmar que um usuário não pode consumir dois códigos Beta
- [ ] Confirmar índices necessários para consulta
- [ ] Confirmar que campos novos são compatíveis com usuários existentes
- [ ] Rodar `npx prisma generate`
- [ ] Confirmar sucesso do Prisma Client
- [ ] Aplicar migration no banco correto de desenvolvimento/teste
- [ ] Nunca aplicar migration em produção por engano durante testes locais

## 38.2 Segurança dos códigos

- [ ] Confirmar que códigos são gerados com fonte criptograficamente segura
- [ ] Confirmar que o banco armazena somente hash do código
- [ ] Confirmar que o código puro não aparece no banco
- [ ] Confirmar que o código puro não aparece em APIs
- [ ] Confirmar que o código puro não aparece em logs
- [ ] Confirmar que o código puro não é armazenado em `localStorage`
- [ ] Confirmar que o código puro não entra em bundle frontend
- [ ] Confirmar normalização com `trim`
- [ ] Confirmar normalização para uppercase
- [ ] Confirmar comportamento consistente com hífens
- [ ] Confirmar que tentativas inválidas não revelam dados internos
- [ ] Confirmar que código já usado não revela quem o utilizou

## 38.3 Regra de unicidade

Regra obrigatória:

```text
1 código = 1 usuário
1 usuário = no máximo 1 código Beta
```

Validar:

- [ ] Usuário A consegue ativar Código A
- [ ] Usuário B NÃO consegue ativar Código A
- [ ] Usuário A NÃO consegue ativar Código B depois de já usar Código A
- [ ] Código usado permanece inutilizável
- [ ] Usuário que já usou Beta não consegue acumular mais 30 dias com outro código

## 38.4 Concorrência

- [ ] Testar duas requisições simultâneas com o mesmo código
- [ ] Confirmar que apenas uma delas recebe o acesso
- [ ] Confirmar que apenas um `PremiumGrant` é criado
- [ ] Confirmar que o banco continua consistente
- [ ] Confirmar rollback completo em falha parcial
- [ ] Tratar `P2002` ou erro equivalente sem erro 500 genérico

Cenário crítico:

```text
Usuário A ─┐
           ├── mesmo código
Usuário B ─┘
```

Resultado:

```text
somente um usuário recebe Premium
```

## 38.5 Retry e idempotência

- [ ] Ativar código com sucesso
- [ ] Reenviar exatamente o mesmo código pelo mesmo usuário
- [ ] Confirmar que não cria novo grant
- [ ] Confirmar que não adiciona mais 30 dias
- [ ] Retornar o grant já existente de forma idempotente
- [ ] Confirmar que duplo clique no botão não duplica ativação

## 38.6 Expiração

- [ ] Confirmar que os 30 dias começam no momento do resgate
- [ ] Confirmar cálculo correto de `expiresAt`
- [ ] Confirmar que `redeemUntil` é independente do período Premium
- [ ] Confirmar que código com `redeemUntil` expirado não pode ser consumido
- [ ] Confirmar que `PremiumGrant` expirado permanece no banco para histórico
- [ ] Confirmar que não é necessário cron para remover o acesso
- [ ] Confirmar que `expiresAt <= now` remove o acesso efetivo automaticamente

## 38.7 Stripe + Beta

- [ ] Confirmar que Stripe continua funcionando de forma independente
- [ ] Confirmar que código Beta não altera `stripeSubscriptionId`
- [ ] Confirmar que código Beta não simula assinatura paga
- [ ] Confirmar que `subscriptionActive` não foi usado de forma incorreta para representar Beta
- [ ] Confirmar resolução central de acesso Premium
- [ ] Confirmar regra:

```text
Premium =
Stripe ativo
OU
PremiumGrant válido
```

- [ ] Usuário Beta ativo recebe acesso aos gates Premium já existentes
- [ ] Usuário Stripe ativo continua Premium
- [ ] Usuário com Beta + Stripe continua Premium
- [ ] Expirar Beta não cancela Stripe
- [ ] Cancelar Stripe não remove Beta ainda válido
- [ ] Usuário já Premium por Stripe não deve consumir código Beta sem necessidade

## 38.8 Onboarding

- [ ] Campo de código Beta é opcional
- [ ] Usuário sem código consegue concluir onboarding normalmente
- [ ] Usuário com código válido recebe feedback claro
- [ ] Usuário com código inválido recebe erro claro
- [ ] Usuário com código já usado recebe erro claro
- [ ] Usuário que já utilizou outro código recebe erro claro
- [ ] Código válido não é perdido por erro visual do frontend
- [ ] Input fica bloqueado/oculto após ativação
- [ ] Onboarding continua idempotente
- [ ] Nenhum dado existente do usuário é apagado

## 38.9 Perfil

- [ ] Mostrar `SmartPlate Premium Beta` quando ativo
- [ ] Mostrar data de término do acesso
- [ ] Mostrar estado expirado quando terminar
- [ ] Manter identificação histórica de `Beta Tester`
- [ ] Não expor código ou hash
- [ ] Não publicar badge Beta automaticamente na Comunidade
- [ ] Não conceder XP Beta ainda
- [ ] Não criar conquista Beta ainda

## 38.10 Gerador administrativo

- [ ] Gerador aceita quantidade de códigos
- [ ] Gerador aceita duração
- [ ] Gerador usa `crypto.randomBytes()` ou equivalente seguro
- [ ] Gerar lote inicial de 30 códigos
- [ ] Cada código possui alta entropia
- [ ] Evitar caracteres visualmente confusos se possível
- [ ] Persistir somente hashes no banco
- [ ] Exibir códigos puros apenas na geração
- [ ] Salvar lote em arquivo local ignorado pelo Git, se implementado
- [ ] Confirmar regra no `.gitignore`
- [ ] Confirmar que arquivo de códigos não entra no commit

## 38.11 Teste real com múltiplos usuários

- [ ] Criar pelo menos 2 contas de teste distintas
- [ ] Ativar Código A com Conta A
- [ ] Verificar Premium da Conta A
- [ ] Tentar Código A com Conta B
- [ ] Confirmar rejeição
- [ ] Ativar Código B com Conta B
- [ ] Confirmar Premium da Conta B
- [ ] Tentar Código C novamente com Conta A
- [ ] Confirmar rejeição
- [ ] Reiniciar sessão
- [ ] Confirmar que acesso Beta permanece
- [ ] Fazer logout/login
- [ ] Confirmar que acesso Beta continua correto

## 38.12 Build

- [ ] Rodar `npm run build`
- [ ] Corrigir qualquer erro decorrente da implementação
- [ ] Confirmar que nenhum secret foi incluído no client bundle
- [ ] Confirmar que nenhuma rota administrativa ficou exposta

---

# 39. Hidratação — Próxima funcionalidade do núcleo

> Implementar depois de validar o sistema Beta.

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

Possível campo:

```prisma
dailyWaterGoalMl Int?
```

## 39.2 API

- [ ] GET dos registros do dia
- [ ] POST novo consumo
- [ ] DELETE de registro incorreto
- [ ] Endpoint/resumo diário
- [ ] Validar quantidade no backend
- [ ] Não aceitar valores negativos
- [ ] Não aceitar valores absurdos sem validação

## 39.3 Interface

- [ ] Card de hidratação no Início
- [ ] Exibir total consumido
- [ ] Exibir meta
- [ ] Barra de progresso
- [ ] Botão `+250 ml`
- [ ] Botão `+500 ml`
- [ ] Quantidade personalizada
- [ ] Permitir desfazer/excluir
- [ ] Estado vazio
- [ ] Loading
- [ ] Erros

Exemplo:

```text
💧 Água

1.450 / 2.500 ml

[ +250 ml ] [ +500 ml ]

████████░░░░ 58%
```

## 39.4 Histórico

- [ ] Histórico diário
- [ ] Histórico semanal
- [ ] Visualizar consumo por dia
- [ ] Permitir corrigir registros

## 39.5 Gamificação futura

- [ ] Não dar XP a cada copo
- [ ] Criar evento `WATER_GOAL_COMPLETED`
- [ ] Conceder XP no máximo uma vez por dia pela meta
- [ ] Usar idempotency key por usuário + data
- [ ] Permitir conquistas relacionadas à hidratação no futuro

---

# 40. Motor central de XP

> Hoje XP não deve ficar espalhado em várias rotas. Criar um fluxo central antes de expandir a gamificação.

## 40.1 Serviço central

- [ ] Criar serviço/função central de gamificação
- [ ] Toda ação elegível deve passar pelo mesmo mecanismo
- [ ] Não atualizar XP manualmente em vários endpoints
- [ ] Reutilizar `XpEvent` existente
- [ ] Definir tipos de eventos
- [ ] Definir regras em um único arquivo/config

Fluxo desejado:

```text
ação real
   ↓
evento persistido
   ↓
GamificationService
   ↓
XP + DailyActivity + Achievement checks
```

## 40.2 Idempotência

- [ ] Todo evento que concede XP deve possuir `idempotencyKey`
- [ ] `idempotencyKey` deve ser UNIQUE
- [ ] Retry não concede XP novamente
- [ ] Duplo clique não concede XP novamente
- [ ] Webhook duplicado no futuro não concede XP novamente

Exemplos:

```text
meal-completed:{mealId}:{date}
water-goal:{userId}:{date}
weight-log:{weightLogId}
activity:{activityLogId}
challenge-completed:{challengeId}:{userId}
```

## 40.3 Regras iniciais a validar

Valores iniciais sugeridos, sujeitos a ajuste futuro:

- [ ] Primeira refeição concluída no dia
- [ ] Todas as refeições planejadas concluídas no dia
- [ ] Meta diária de água atingida
- [ ] Registro de peso
- [ ] Onboarding concluído
- [ ] Conquista desbloqueada
- [ ] Desafio concluído futuramente
- [ ] Atividade física futuramente

## 40.4 Anti-abuso

- [ ] Não conceder XP por clique
- [ ] Não conceder XP repetido pela mesma ação
- [ ] Definir limites diários quando necessário
- [ ] Não permitir farm de XP editando/removendo/recriando registros
- [ ] Pensar em reversão de XP para ações excluídas quando fizer sentido

## 40.5 XP de hoje

- [ ] Calcular XP do dia
- [ ] Mostrar no Dashboard
- [ ] Mostrar breakdown das ações

Exemplo:

```text
Hoje +30 XP

+5  Café concluído
+5  Almoço concluído
+10 Meta de água
+10 Dia completo
```

## 40.6 Histórico de XP

- [ ] Criar histórico
- [ ] Exibir tipo do evento
- [ ] Exibir valor
- [ ] Exibir data
- [ ] Não mostrar chaves internas/idempotencyKey ao usuário

---

# 41. Streak / sequência real

> Implementar depois do motor de XP estar consistente.

## 41.1 Definir `dia ativo`

O streak não deve significar apenas abrir o aplicativo.

Possível regra inicial:

```text
Dia qualificado =
refeição concluída
OU
meta de água atingida
OU
atividade física registrada
```

- [ ] Formalizar a regra
- [ ] Centralizar a regra
- [ ] Não exigir perfeição
- [ ] Não exigir treino diário
- [ ] Não usar somente login como critério

## 41.2 DailyActivity

- [ ] Revisar model atual `DailyActivity`
- [ ] Usá-lo como resumo diário
- [ ] Registrar refeições concluídas
- [ ] Registrar total/meta de água
- [ ] Registrar atividade física no futuro
- [ ] Registrar `qualifiedForStreak`
- [ ] Evitar recalcular informações de forma diferente em cada página

Exemplo conceitual:

```text
DailyActivity
2026-08-23

mealsCompleted: 3
mealsPlanned: 4
waterGoalCompleted: true
physicalActivityCompleted: false
qualifiedForStreak: true
```

## 41.3 Timezone

- [ ] Usar timezone do usuário/SocialProfile
- [ ] Não usar UTC puro para definir troca de dia
- [ ] Testar virada de dia
- [ ] Testar usuário em timezone diferente
- [ ] Evitar perder streak por diferença UTC/local

## 41.4 Current e longest streak

- [ ] Atualizar `currentStreak`
- [ ] Atualizar `longestStreak`
- [ ] Garantir idempotência
- [ ] Garantir que múltiplas ações no mesmo dia contem apenas um dia
- [ ] Testar quebra de sequência
- [ ] Testar retomada após quebra

---

# 42. Conquistas — revisão completa

> Fazer depois de XP + streak.

## 42.1 Alimentação

- [ ] Primeira refeição concluída
- [ ] Primeiro dia completo
- [ ] X refeições concluídas
- [ ] Sequência de alimentação

## 42.2 Hidratação

- [ ] Primeira meta diária de água
- [ ] Meta em 3 dias
- [ ] Meta em 7 dias
- [ ] Meta em 30 dias

## 42.3 Streak

- [ ] 3 dias
- [ ] 7 dias
- [ ] 30 dias
- [ ] 100 dias

## 42.4 Progresso

- [ ] Primeiro registro de peso
- [ ] 10 registros de peso
- [ ] Primeira foto de progresso
- [ ] Marco de evolução

## 42.5 Beta

Somente depois que o motor de achievements estiver validado:

- [ ] Criar conquista histórica `Beta Tester`
- [ ] Criar conquista/medalha `Early Adopter`, se desejado
- [ ] Conceder apenas para usuários realmente elegíveis
- [ ] Não depender de Beta ainda estar ativo
- [ ] Não duplicar conquista

---

# 43. Níveis

> Implementar/revisar quando XP estiver confiável.

- [ ] Definir curva de XP
- [ ] Centralizar `getLevelFromXp(totalXp)`
- [ ] Não duplicar regras de nível em componentes
- [ ] Exibir progresso para próximo nível
- [ ] Validar níveis no Perfil
- [ ] Validar níveis na Comunidade
- [ ] Validar ranking

Exemplo inicial:

```text
Nível 1   0 XP
Nível 2   100 XP
Nível 3   250 XP
Nível 4   450 XP
Nível 5   700 XP
```

Valores podem ser ajustados depois.

---

# 44. Planos Free x Premium — NÃO definir ainda

> Esta etapa deve acontecer somente quando o aplicativo estiver funcional e os módulos principais estiverem fechados.

## Manter por enquanto

- [ ] Preservar regras atuais
- [ ] Beta deve passar pelos gates Premium já existentes
- [ ] Stripe deve continuar funcionando
- [ ] Não criar restrições artificiais agora

## Definir posteriormente

- [ ] Quantidade de gerações de plano alimentar no Free
- [ ] Limite de uso de IA
- [ ] Quantidade de regenerações
- [ ] Limites da lista de compras
- [ ] Recursos de personalização
- [ ] Histórico disponível
- [ ] Recursos de comunidade
- [ ] Recursos de grupos
- [ ] Integrações externas
- [ ] Relatórios
- [ ] Insights de IA
- [ ] Antes & Depois
- [ ] Recursos Premium exclusivos
- [ ] Estratégia de upgrade
- [ ] Trial
- [ ] Grace period
- [ ] Expiração/cancelamento
- [ ] Tratamento de downgrade
- [ ] Comparativo visual Free x Premium

## Critério importante

Antes de restringir qualquer recurso:

- [ ] Confirmar que o recurso funciona 100%
- [ ] Confirmar valor real para o usuário
- [ ] Não limitar funcionalidades essenciais de segurança
- [ ] Não prejudicar dados já criados após downgrade
- [ ] Não apagar dados ao expirar Premium

---

# 45. Painel administrativo Beta — Futuro

> Não é necessário para testar agora, mas será útil antes de ampliar o Beta.

- [ ] Criar área administrativa protegida
- [ ] Exibir total de códigos criados
- [ ] Exibir códigos disponíveis
- [ ] Exibir códigos utilizados
- [ ] Exibir códigos desativados
- [ ] Exibir data de resgate
- [ ] Exibir usuário associado sem expor dados além do necessário
- [ ] Permitir desativar código não utilizado
- [ ] Permitir criar novo lote
- [ ] Permitir escolher duração do lote
- [ ] Permitir definir `redeemUntil`
- [ ] Nunca exibir código puro depois da geração
- [ ] Permitir revogar `PremiumGrant` em caso administrativo
- [ ] Registrar auditoria de revogação

---

# 46. Códigos promocionais — Evolução futura

A estrutura Beta pode futuramente suportar outras concessões.

Possíveis categorias:

```text
BETA
PROMO
PARTNER
GIFT
ADMIN
```

- [ ] Generalizar somente quando houver necessidade real
- [ ] Não transformar BetaCode em sistema excessivamente complexo agora
- [ ] Criar campanhas promocionais
- [ ] Definir quantidade máxima de usos quando necessário
- [ ] Definir datas de validade
- [ ] Definir duração Premium
- [ ] Criar códigos de parceiros
- [ ] Criar gifts
- [ ] Criar grants administrativos

---

# 47. Ordem atualizada de implementação

## Sessão A — Fechar Perfil

- [ ] Antes & Depois restaurado e funcional
- [ ] Fotos persistentes
- [ ] Histórico de fotos
- [ ] Onboarding validado
- [ ] Dados físicos validados
- [ ] Perfil sem mocks

## Sessão B — Beta Premium

- [ ] Implementar BetaCode
- [ ] Implementar PremiumGrant
- [ ] Integrar onboarding
- [ ] Gerar códigos
- [ ] Rodar toda a seção 38 deste checklist

## Sessão C — Hidratação

- [ ] Implementar seção 39

## Sessão D — Gamificação

- [ ] Implementar motor central de XP
- [ ] Validar idempotência
- [ ] Implementar XP diário
- [ ] Implementar histórico de XP

## Sessão E — Streak

- [ ] Formalizar dia ativo
- [ ] Integrar DailyActivity
- [ ] Corrigir timezone
- [ ] Validar current/longest streak

## Sessão F — Conquistas

- [ ] Revisar achievements existentes
- [ ] Integrar eventos reais
- [ ] Criar conquistas de alimentação
- [ ] Criar conquistas de hidratação
- [ ] Criar conquistas de streak
- [ ] Criar conquistas de progresso
- [ ] Adicionar Beta Tester posteriormente

## Sessão G — Plano Semanal

- [ ] Auditoria completa
- [ ] Dados reais
- [ ] Geração de IA
- [ ] Refeições concluídas
- [ ] Favoritos
- [ ] Trocas
- [ ] Integração com XP

## Sessão H — Início / Dashboard

- [ ] Refeições do dia
- [ ] Hidratação
- [ ] Peso/progresso
- [ ] XP do dia
- [ ] Streak
- [ ] Conquistas recentes
- [ ] Ações rápidas

## Sessão I — Lista de Compras

- [ ] Auditoria completa
- [ ] Persistência
- [ ] Integração com planos
- [ ] Estados reais

## Sessão J — Assinatura

- [ ] Auditoria Stripe
- [ ] Resolver Premium centralmente
- [ ] Validar Beta + Stripe
- [ ] Somente depois definir Free x Premium

## Sessão K — Comunidade final

- [ ] Ranking com XP real
- [ ] Streak real
- [ ] Conquistas reais
- [ ] Posts reais
- [ ] Amigos
- [ ] Grupos
- [ ] Desafios
- [ ] Integrações futuras preparadas

---

# 48. Regra para considerar cada sessão concluída

Uma sessão só deve ser marcada como concluída quando:

- [ ] Não depender de mock
- [ ] Dados forem persistidos
- [ ] Backend validar entrada
- [ ] Frontend tratar loading
- [ ] Frontend tratar erro
- [ ] Frontend tratar estado vazio
- [ ] Usuário não conseguir acessar dados de outro usuário
- [ ] Retry não criar duplicidade
- [ ] Build funcionar
- [ ] Fluxo funcionar após logout/login
- [ ] Funcionar com usuário antigo
- [ ] Funcionar com usuário novo
- [ ] Não quebrar Comunidade
- [ ] Não quebrar Stripe
- [ ] Não expor informações privadas

---

# 49. Sistema de Conquistas — Catálogo inicial de 50 conquistas

> Objetivo: criar uma experiência completa de conquistas com estados bloqueado, desbloqueado e “em breve”, usando dados reais do SmartPlate e respeitando a ordem de implementação dos módulos deste checklist.

## 49.1 Tela principal de conquistas

Na seção de Conquistas do Perfil/Comunidade, mostrar:

```text
Conquistas

2 / 50 desbloqueadas
4% concluído

[ Ver todas as conquistas ]
```

Regras:

- [x] A contagem deve ser dinâmica
- [x] O total deve vir do catálogo real
- [x] O número desbloqueado deve vir de `UserAchievement`
- [x] Nunca hardcodar `2 / 50`
- [x] Mostrar barra de progresso geral
- [x] Atualizar automaticamente quando novas conquistas forem adicionadas

---

## 49.2 Botão “Ver todas as conquistas”

Ao clicar:

```text
Todas as conquistas

2 / 50 desbloqueadas
████░░░░░░░░░░░░ 4%

Todas | Alimentação | Hidratação | Sequência |
Progresso | Atividade | Social | Desafios | Especiais
```

Adicionar filtros:

- [x] Todas
- [x] Desbloqueadas
- [x] Bloqueadas
- [x] Alimentação
- [x] Hidratação
- [x] Sequência
- [x] Progresso
- [x] Atividade
- [x] Social
- [x] Desafios
- [x] Especiais

---

## 49.3 Estado desbloqueado

Exemplo:

```text
┌─────────────────────────────────┐
│ 🥗 Primeiro Prato               │
│                                 │
│ Concluiu sua primeira refeição  │
│ planejada.                      │
│                                 │
│ ✅ Desbloqueada                 │
│ 23 ago. 2026                    │
└─────────────────────────────────┘
```

- [x] Ícone em destaque
- [x] Card com aparência normal
- [x] Badge `Desbloqueada`
- [x] Mostrar data de desbloqueio
- [x] Manter `unlockedAt` original
- [x] Não repetir animação toda vez que abrir a página

---

## 49.4 Estado bloqueado

Exemplo:

```text
┌─────────────────────────────────┐
│ 🔒 💧 Hidratação Consistente     │
│                                 │
│ Atinja sua meta de água em      │
│ 7 dias diferentes.              │
│                                 │
│ Como desbloquear:               │
│ Complete a meta diária de água  │
│ em 7 dias.                      │
│                                 │
│ Progresso: 2 / 7                │
└─────────────────────────────────┘
```

Visual sugerido:

- [x] `opacity` aproximada entre 55% e 65%
- [x] Saturação reduzida
- [x] Cadeado visível
- [x] Badge `Bloqueada`
- [x] Texto continua legível
- [x] Não depender somente de cor
- [x] Mostrar `Como desbloquear`
- [x] Mostrar progresso real quando aplicável

---

## 49.5 Estado “Em breve”

Conquistas que dependem de módulos ainda não implementados devem aparecer como:

```text
🔒 Em breve
```

e não como uma conquista normalmente alcançável.

Exemplo:

```text
🏃 Em Movimento

Registre sua primeira atividade física.

🔒 Em breve

Disponível quando o registro de atividades
for liberado no SmartPlate.
```

- [x] Criar estado `COMING_SOON` ou equivalente
- [x] Não mostrar progresso falso
- [x] Não executar regra de desbloqueio antes do módulo existir
- [x] Trocar automaticamente para `LOCKED` quando o recurso for lançado

Estados recomendados:

```text
LOCKED
UNLOCKED
COMING_SOON
```

---

# 50. Catálogo inicial — 50 conquistas

## Primeiros passos — 5

### 01. 👋 Bem-vindo ao SmartPlate
**Código:** `WELCOME`

**Descrição:** Complete seu onboarding.

**Como desbloquear:** Finalize as etapas obrigatórias do onboarding.

---

### 02. 🧪 Beta Tester
**Código:** `BETA_TESTER`

**Descrição:** Participou da fase Beta do SmartPlate.

**Como desbloquear:** Ative um código Beta válido.

Regras:
- [x] Histórico permanente
- [x] Continua desbloqueada após o Premium Beta expirar
- [x] Não duplicar

---

### 03. 📸 Identidade Completa
**Código:** `PROFILE_COMPLETE`

**Descrição:** Deixou seu perfil completo.

**Como desbloquear:** Tenha nome, username, avatar e bio preenchidos.

---

### 04. 🎯 Objetivo Definido
**Código:** `GOAL_DEFINED`

**Descrição:** Definiu um objetivo pessoal no SmartPlate.

**Como desbloquear:** Preencha seu objetivo no Perfil.

---

### 05. 🧭 Pronto para Começar
**Código:** `READY_TO_START`

**Descrição:** Configurou os principais dados para usar o SmartPlate.

**Como desbloquear:** Complete onboarding, objetivo e preferências alimentares.

---

## Alimentação — 10

### 06. 🥗 Primeiro Prato
**Código:** `FIRST_MEAL`

**Descrição:** Concluiu sua primeira refeição planejada.

**Como desbloquear:** Marque uma refeição do plano como concluída.

---

### 07. 🍽️ Dia Completo
**Código:** `FULL_MEAL_DAY`

**Descrição:** Completou todas as refeições planejadas de um dia.

**Como desbloquear:** Conclua 100% das refeições planejadas para o mesmo dia.

---

### 08. 🌅 Bom Dia
**Código:** `FIRST_BREAKFAST`

**Descrição:** Concluiu seu primeiro café da manhã.

**Como desbloquear:** Marque um café da manhã planejado como concluído.

---

### 09. ☀️ Hora do Almoço
**Código:** `FIRST_LUNCH`

**Descrição:** Concluiu seu primeiro almoço.

**Como desbloquear:** Marque um almoço planejado como concluído.

---

### 10. 🌙 Fechando o Dia
**Código:** `FIRST_DINNER`

**Descrição:** Concluiu seu primeiro jantar.

**Como desbloquear:** Marque um jantar planejado como concluído.

---

### 11. ✅ 10 Refeições
**Código:** `MEALS_10`

**Como desbloquear:** Complete 10 refeições planejadas.

Progresso:

```text
7 / 10
```

---

### 12. ✅ 50 Refeições
**Código:** `MEALS_50`

**Como desbloquear:** Complete 50 refeições planejadas.

---

### 13. 🏅 100 Refeições
**Código:** `MEALS_100`

**Como desbloquear:** Complete 100 refeições planejadas.

---

### 14. ⭐ Favorito
**Código:** `FIRST_FAVORITE`

**Descrição:** Salvou seu primeiro favorito.

**Como desbloquear:** Favorite sua primeira refeição/plano quando o sistema definitivo de favoritos estiver validado.

---

### 15. 🔄 Experimentando Algo Novo
**Código:** `FIRST_MEAL_SWAP`

**Descrição:** Personalizou seu plano.

**Como desbloquear:** Faça sua primeira troca real de refeição.

---

## Hidratação — 7

### 16. 💧 Primeiro Gole
**Código:** `FIRST_WATER_LOG`

**Como desbloquear:** Registre seu primeiro consumo de água.

---

### 17. 💦 Meta Alcançada
**Código:** `FIRST_WATER_GOAL`

**Como desbloquear:** Alcance 100% da sua meta diária de hidratação.

---

### 18. 💧 3 Dias Hidratado
**Código:** `WATER_GOAL_3_DAYS`

**Como desbloquear:** Atinja a meta diária de água em 3 dias diferentes.

---

### 19. 💦 7 Dias Hidratado
**Código:** `WATER_GOAL_7_DAYS`

**Como desbloquear:** Atinja a meta diária em 7 dias diferentes.

---

### 20. 🌊 30 Dias Hidratado
**Código:** `WATER_GOAL_30_DAYS`

**Como desbloquear:** Atinja a meta diária em 30 dias diferentes.

---

### 21. 🫗 50 Registros
**Código:** `WATER_LOGS_50`

**Como desbloquear:** Faça 50 registros válidos de consumo de água.

Observação:
- [ ] Não conceder XP por cada copo
- [ ] Esta conquista é apenas milestone

---

### 22. 🚰 Hidratação Frequente
**Código:** `WATER_WEEK_CONSISTENCY`

**Como desbloquear:** Registre consumo de água em 7 dias diferentes.

---

## Sequência / Streak — 7

### 23. 🔥 Começou a Sequência
**Código:** `STREAK_3`

**Como desbloquear:** Alcance uma sequência de 3 dias ativos.

---

### 24. 🔥 Uma Semana
**Código:** `STREAK_7`

**Como desbloquear:** Alcance 7 dias consecutivos ativos.

---

### 25. 🔥 Duas Semanas
**Código:** `STREAK_14`

**Como desbloquear:** Alcance 14 dias consecutivos ativos.

---

### 26. 🔥 Um Mês
**Código:** `STREAK_30`

**Como desbloquear:** Alcance 30 dias consecutivos ativos.

---

### 27. 🔥 60 Dias
**Código:** `STREAK_60`

**Como desbloquear:** Alcance 60 dias consecutivos ativos.

---

### 28. 🔥 100 Dias
**Código:** `STREAK_100`

**Como desbloquear:** Alcance 100 dias consecutivos ativos.

---

### 29. 🏆 Imparável
**Código:** `STREAK_365`

**Como desbloquear:** Alcance 365 dias consecutivos ativos.

Regra:
- [ ] Usar definição oficial de `dia ativo`
- [ ] Não exigir alimentação perfeita
- [ ] Não exigir atividade física diária

---

## Progresso — 7

### 30. ⚖️ Primeiro Registro
**Código:** `FIRST_WEIGHT_LOG`

**Como desbloquear:** Registre seu peso pela primeira vez.

---

### 31. 📊 Acompanhando a Jornada
**Código:** `WEIGHT_LOGS_10`

**Como desbloquear:** Faça 10 registros válidos de peso.

---

### 32. 📈 Histórico em Construção
**Código:** `WEIGHT_LOGS_25`

**Como desbloquear:** Faça 25 registros válidos de peso.

---

### 33. 📸 Primeiro Registro Visual
**Código:** `FIRST_PROGRESS_PHOTO`

**Como desbloquear:** Adicione sua primeira foto em Antes & Depois.

---

### 34. 🖼️ Antes & Agora
**Código:** `BEFORE_AFTER_READY`

**Como desbloquear:** Tenha pelo menos duas fotos de progresso.

---

### 35. 🗓️ Um Mês de Jornada
**Código:** `PROGRESS_30_DAYS`

**Como desbloquear:** Tenha registros de progresso separados por pelo menos 30 dias.

---

### 36. 🎯 Marco Pessoal
**Código:** `PERSONAL_GOAL_REACHED`

**Como desbloquear:** Complete uma meta pessoal acompanhada pelo sistema.

Regras:
- [ ] Não incentivar perda extrema de peso
- [ ] Não premiar comportamento inseguro
- [ ] Só ativar após sistema definitivo de metas existir

---

## Atividade física — 7

### 37. 🏃 Em Movimento
**Código:** `FIRST_ACTIVITY`

**Como desbloquear:** Registre sua primeira atividade física válida.

---

### 38. 🏃 10 Atividades
**Código:** `ACTIVITIES_10`

**Como desbloquear:** Registre 10 atividades físicas.

---

### 39. 🏅 50 Atividades
**Código:** `ACTIVITIES_50`

**Como desbloquear:** Registre 50 atividades físicas.

---

### 40. 🏆 100 Atividades
**Código:** `ACTIVITIES_100`

**Como desbloquear:** Registre 100 atividades físicas.

---

### 41. 📅 Semana Ativa
**Código:** `ACTIVE_3_DAYS_WEEK`

**Como desbloquear:** Registre atividade em 3 dias diferentes da mesma semana.

---

### 42. ⏱️ 150 Minutos
**Código:** `ACTIVE_MINUTES_150`

**Como desbloquear:** Acumule 150 minutos de atividades válidas.

---

### 43. 🧭 Explorador
**Código:** `ACTIVITY_EXPLORER`

**Como desbloquear:** Registre pelo menos 5 tipos diferentes de atividade física.

---

## Social — 5

### 44. 💬 Primeira Publicação
**Código:** `FIRST_POST`

**Como desbloquear:** Faça sua primeira publicação válida na Comunidade.

---

### 45. 🤝 Primeira Amizade
**Código:** `FIRST_FRIEND`

**Como desbloquear:** Tenha sua primeira solicitação de amizade aceita.

---

### 46. 👥 Fazendo Parte
**Código:** `FIRST_GROUP`

**Como desbloquear:** Entre no seu primeiro grupo.

---

### 47. ❤️ Apoio da Comunidade
**Código:** `FIRST_REACTION_RECEIVED`

**Como desbloquear:** Receba sua primeira reação em uma publicação.

---

### 48. 💬 Conversa Iniciada
**Código:** `FIRST_COMMENT_RECEIVED`

**Como desbloquear:** Receba seu primeiro comentário válido em uma publicação.

---

## Desafios e especiais — 2

### 49. 🎯 Primeiro Desafio
**Código:** `FIRST_CHALLENGE_COMPLETED`

**Como desbloquear:** Participe e conclua seu primeiro desafio.

---

### 50. 🌟 Vida em Equilíbrio
**Código:** `BALANCED_WEEK`

**Descrição:** Combinou diferentes hábitos ao longo da semana.

**Como desbloquear:** Em uma mesma semana, cumpra os critérios definidos de alimentação acompanhada, hidratação e atividade física.

Regras:
- [ ] Não exigir perfeição
- [ ] Definir regra exata somente quando hidratação e ActivityLog estiverem prontos

---

# 51. Categorias oficiais

Usar códigos internos consistentes:

```text
ONBOARDING
FOOD
HYDRATION
STREAK
PROGRESS
ACTIVITY
SOCIAL
CHALLENGE
SPECIAL
```

---

# 52. Catálogo central

Não espalhar título, descrição e regras em componentes diferentes.

Criar um catálogo central semelhante a:

```ts
ACHIEVEMENTS = {
  FIRST_MEAL: {
    title: "Primeiro Prato",
    description: "Concluiu sua primeira refeição planejada.",
    unlockDescription: "Marque uma refeição do seu plano como concluída.",
    category: "FOOD",
    icon: "🥗",
    target: 1,
  },

  MEALS_10: {
    title: "10 Refeições",
    description: "Complete 10 refeições planejadas.",
    unlockDescription: "Alcance 10 refeições concluídas no total.",
    category: "FOOD",
    icon: "✅",
    target: 10,
  }
}
```

Regras:

- [x] Código interno estável
- [x] Texto pode mudar sem quebrar banco
- [x] `UserAchievement` referencia código
- [x] Catálogo não deve ser duplicado entre telas
- [x] Backend continua sendo autoridade para desbloqueio

---

# 53. Progresso incremental

API deve conseguir retornar:

```json
{
  "code": "MEALS_10",
  "unlocked": false,
  "status": "LOCKED",
  "progress": 7,
  "target": 10
}
```

Interface:

```text
7 / 10
██████████████░░░░░
```

Aplicar a:

- [x] Refeições
- [ ] Água — catálogo pronto, mas sem WaterLog ainda (COMING_SOON)
- [ ] Streak — catálogo pronto, mas regra ainda provisória (COMING_SOON)
- [x] Peso
- [ ] Atividades — catálogo pronto, mas sem ActivityLog ainda (COMING_SOON)
- [ ] Desafios — catálogo pronto, mas ainda COMING_SOON nesta sessão

Regras:

- [x] Uma única fonte de cálculo
- [x] `progress` nunca maior que `target` na UI
- [x] Não alterar `unlockedAt` após desbloqueio

---

# 54. Detalhes da conquista

Ao clicar em um card bloqueado:

```text
🔥 Uma Semana

Uma semana inteira de consistência.

🔒 Bloqueada

Como desbloquear:
Alcance uma sequência de 7 dias ativos.

Seu progresso:
5 / 7 dias
```

Quando desbloqueada:

```text
✅ Desbloqueada
23 de agosto de 2026
```

---

# 55. Nova conquista desbloqueada

Quando ocorrer desbloqueio:

```text
🏆 Nova conquista!

🔥 Uma Semana

Você alcançou 7 dias de sequência.

[ Ver conquista ]
[ Continuar ]
```

- [x] Exibir apenas no primeiro desbloqueio
- [x] Persistir antes de mostrar
- [ ] Não depender somente de toast — nesta sessão a celebração é só toast (`react-hot-toast`); o modal enriquecido do exemplo (com "Ver conquista"/"Continuar") fica para depois
- [ ] Se várias forem desbloqueadas juntas, usar fila ou resumo — hoje empilha toasts do react-hot-toast, sem fila controlada
- [x] Não bloquear a ação principal do usuário

---

# 56. Compartilhamento futuro

Conquistas desbloqueadas poderão futuramente possuir:

```text
[ Compartilhar na Comunidade ]
```

- [ ] Nunca compartilhar automaticamente
- [ ] Usuário escolhe
- [ ] Criar post `ACHIEVEMENT`
- [ ] Não expor dados privados que originaram a conquista

Exemplo:

```text
🏆 Lucas desbloqueou uma conquista

🔥 Uma Semana

7 dias de consistência no SmartPlate.
```

---

# 57. XP por conquista — definir depois

Não definir valores finais antes do motor central de XP.

Possível estrutura futura:

```text
COMMON     +10 XP
UNCOMMON   +20 XP
RARE       +40 XP
EPIC       +75 XP
SPECIAL    variável
```

- [ ] XP uma única vez
- [ ] `XpEvent` com idempotencyKey
- [ ] Não permitir farm
- [ ] Não recompensar comportamento extremo

---

# 58. Raridade opcional

Preparar estrutura futura:

```text
COMMON
UNCOMMON
RARE
EPIC
SPECIAL
```

Exemplos:

```text
Primeiro Prato   COMMON
10 Refeições     COMMON
100 Refeições    RARE
Streak 30        RARE
Streak 100       EPIC
Streak 365       EPIC
Beta Tester      SPECIAL
```

Não é obrigatório mostrar raridade na primeira versão.

---

# 59. Integridade e segurança

- [x] Backend é autoridade
- [x] Frontend nunca desbloqueia conquista arbitrariamente
- [x] Não aceitar `achievementCode` enviado pelo usuário como prova
- [x] Desbloquear apenas a partir de evento real persistido
- [x] `UserAchievement` deve impedir duplicidade
- [x] Retry deve ser idempotente
- [x] Mesmo achievement só pode existir uma vez por usuário
- [x] Alterar/deletar dados não deve permitir farm
- [ ] Regras por dia/semana devem respeitar timezone — nenhuma regra AVAILABLE nesta sessão depende de fronteira de dia/semana ainda

Constraint recomendada:

```text
@@unique([userId, achievementCode])
```

---

# 60. Ordem de ativação

## Disponíveis primeiro

Quando os módulos atuais forem validados:

- [x] WELCOME
- [x] BETA_TESTER
- [x] PROFILE_COMPLETE
- [x] GOAL_DEFINED
- [x] READY_TO_START
- [x] FIRST_MEAL
- [x] FULL_MEAL_DAY
- [x] FIRST_BREAKFAST
- [x] FIRST_LUNCH
- [x] FIRST_DINNER
- [x] MEALS_10
- [x] MEALS_50
- [x] MEALS_100
- [x] FIRST_WEIGHT_LOG
- [x] WEIGHT_LOGS_10
- [x] WEIGHT_LOGS_25
- [x] FIRST_PROGRESS_PHOTO
- [x] BEFORE_AFTER_READY
- [x] FIRST_POST
- [x] FIRST_FRIEND

## Após Hidratação

- [ ] FIRST_WATER_LOG
- [ ] FIRST_WATER_GOAL
- [ ] WATER_GOAL_3_DAYS
- [ ] WATER_GOAL_7_DAYS
- [ ] WATER_GOAL_30_DAYS
- [ ] WATER_LOGS_50
- [ ] WATER_WEEK_CONSISTENCY

## Após Streak

- [ ] STREAK_3
- [ ] STREAK_7
- [ ] STREAK_14
- [ ] STREAK_30
- [ ] STREAK_60
- [ ] STREAK_100
- [ ] STREAK_365

## Após ActivityLog

- [ ] FIRST_ACTIVITY
- [ ] ACTIVITIES_10
- [ ] ACTIVITIES_50
- [ ] ACTIVITIES_100
- [ ] ACTIVE_3_DAYS_WEEK
- [ ] ACTIVE_MINUTES_150
- [ ] ACTIVITY_EXPLORER

## Após grupos/desafios/social final

- [x] FIRST_GROUP — grupos/membros já são reais e persistidos (`CommunityGroup`/`GroupMember`), adiantado nesta sessão
- [x] FIRST_REACTION_RECEIVED — reações reais já existem, adiantado nesta sessão
- [x] FIRST_COMMENT_RECEIVED — comentários reais já existem, adiantado nesta sessão
- [ ] FIRST_CHALLENGE_COMPLETED — mantido `COMING_SOON` nesta sessão

## Após integração completa dos módulos

- [ ] BALANCED_WEEK
- [ ] PERSONAL_GOAL_REACHED
- [x] PROGRESS_30_DAYS — regra (intervalo ≥30 dias entre fotos) é clara e computável a partir de `ProgressPhoto` real, adiantado nesta sessão
- [ ] FIRST_FAVORITE
- [ ] FIRST_MEAL_SWAP

---

# 61. Critério para considerar a tela pronta

- [x] `X / 50` é real
- [x] Nenhuma conquista desbloqueada é mock
- [x] Bloqueadas ficam opacas, mas legíveis
- [x] Desbloqueadas ficam destacadas
- [x] Todas mostram `Como desbloquear`
- [x] Incrementais mostram progresso real
- [x] Recursos ainda inexistentes aparecem como `Em breve`
- [x] Filtros funcionam
- [ ] Mobile funciona — implementado com classes responsivas (grid 1/2/3 colunas, chips com scroll horizontal), mas não há navegador disponível neste ambiente para validação visual real
- [x] Desbloqueio persiste após logout/login
- [x] Mesma conquista nunca desbloqueia duas vezes
- [ ] Datas respeitam timezone — nenhuma regra AVAILABLE nesta sessão depende de fronteira de dia/semana
- [x] Nenhum dado privado é exposto

---

### Implementação

Data: 2026-08-23

Implementado:
- catálogo central de 50 conquistas (`lib/community/achievement-catalog.ts`), com títulos/descrições/"como desbloquear" fiéis a este Markdown;
- motor de avaliação/desbloqueio idempotente (`lib/community/achievement-engine.ts`), reaproveitando `UserAchievement` já existente (sem migration nova);
- endpoint `GET /api/achievements` (resumo + lista completa com status/progresso/target/unlockedAt);
- tela "Todas as conquistas" (`components/AchievementsModal.tsx`) com filtros de status e categoria, cards bloqueada/desbloqueada/em breve, detalhe por conquista;
- resumo no Perfil (`components/AchievementsSummaryCard.tsx`) com contador `X / 50`, percentual, barra de progresso e botão "Ver todas as conquistas";
- estados `LOCKED` / `UNLOCKED` / `COMING_SOON` — 24 conquistas `AVAILABLE` (onboarding, refeições, peso, fotos de progresso, social) e 26 `COMING_SOON` (hidratação, streak definitivo, atividade física, desafios, favoritos/troca ambíguos, meta pessoal) — nenhuma foi forçada a `AVAILABLE` sem dado real por trás;
- reconciliação retroativa a cada consulta (contas antigas recebem conquistas já cumpridas sem refazer a ação);
- proteção contra duplicidade (constraint `@@unique([userId, achievementCode])` já existente + tratamento de `P2002`).

Adiantado em relação à seção 60 (ordem de ativação original), após confirmar no código atual que já são reais: `FIRST_GROUP`, `FIRST_REACTION_RECEIVED`, `FIRST_COMMENT_RECEIVED` (grupos/reações/comentários já persistidos) e `PROGRESS_30_DAYS` (regra computável a partir de `ProgressPhoto` real).

Ainda pendente:
- hidratação (WaterLog);
- atividade física (ActivityLog);
- regra definitiva de streak/"dia ativo" (os `STREAK_*` têm catálogo pronto, mas continuam `COMING_SOON` — o motor antigo ainda concede STREAK_3/7/14/30 via streak provisório em `recordMealCompletion`, e essas linhas antigas são intencionalmente ignoradas pela tela nova até a regra definitiva existir);
- XP definitivo (nenhum XP foi concedido por conquista nesta tarefa);
- desafios (`FIRST_CHALLENGE_COMPLETED`, `BALANCED_WEEK`);
- favoritos e troca de refeição (`FIRST_FAVORITE`, `FIRST_MEAL_SWAP` — ambíguos até o Plano Semanal ser auditado);
- meta pessoal (`PERSONAL_GOAL_REACHED`);
- compartilhamento de conquistas na Comunidade;
- celebração de novo desbloqueio hoje é só toast — modal enriquecido com fila/resumo fica para depois.

