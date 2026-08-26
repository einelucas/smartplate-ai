# SmartPlate AI — Code Audit

## Data da auditoria

2026-08-26

## Resumo executivo

Auditoria focada em Comunidade, Grupos, Conquistas, upload/renderização de
imagens e integração frontend↔backend↔banco. Dois bugs P1 explicitamente
reportados foram investigados até a causa raiz (não só o sintoma), corrigidos
reaproveitando a arquitetura existente (sem sistema paralelo), e cobertos por
teste automatizado de regressão:

1. **Conquistas não podiam ser compartilhadas** — a rota de criação de post e
   os dois mecanismos de celebração só reconheciam o catálogo antigo de
   conquistas (10 códigos). O catálogo real e ativo hoje (`achievement-catalog.ts`,
   57 códigos) não era reconhecido, então publicar qualquer conquista real
   (a grande maioria das que existem) falhava com `400 Conquista inválida`.
2. **Imagens cortadas no Desktop** — o card do feed usava `object-cover` dentro
   de uma altura limitada, cortando qualquer foto vertical (3:4, 4:5, 9:16)
   cuja altura excedesse o limite. Corrigido para `object-contain` com fundo
   neutro, preservando a proporção original em qualquer formato.

Além dos dois bugs confirmados, a auditoria mapeou toda a superfície de rotas
de Comunidade/Grupos (38 endpoints), o pipeline completo de upload/crop de
imagem, e encontrou mais três inconsistências reais e corrigíveis com baixo
risco (detalhadas abaixo). Nenhuma migration de banco foi necessária — os
dois bugs eram de lógica de aplicação, não de schema.

**Escopo não coberto nesta rodada** (ver "Melhorias recomendadas para outra
task"): teste visual real em múltiplos viewports (nenhuma ferramenta de
automação de navegador/Playwright disponível neste ambiente), auditoria
linha a linha de autorização em todas as ~40 rotas de Comunidade (foram
verificadas as rotas diretamente relacionadas aos bugs investigados e uma
amostra adicional, não a totalidade), e varredura exaustiva de campos não
utilizados em todos os ~30 modelos do `schema.prisma` (o schema já vinha
sendo mantido ativamente ao longo desta mesma sessão).

## Problemas críticos encontrados

Nenhum problema **P0** (perda de dado, vulnerabilidade ativa, aplicação
quebrada) foi encontrado na área auditada. Os dois problemas abaixo são
**P1** (funcionalidade principal quebrada):

- Compartilhamento de conquistas — publicação falhava para a maioria real das conquistas.
- Imagens cortadas no feed — qualquer foto vertical publicada aparecia cortada no Desktop.

## Bugs corrigidos

### 1. Compartilhamento de conquistas (P1)

**Arquivo:** `app/api/community/posts/route.ts`
**Causa raiz:** ao criar um post `type: "ACHIEVEMENT"`, o servidor verifica
corretamente (`prisma.userAchievement.findUnique`) que o usuário realmente
desbloqueou aquele código — isso já estava certo e seguro. O problema vinha
depois: `const def = (ACHIEVEMENTS as Record<...>)[code]` usava
`lib/community/achievements.ts`, o catálogo **antigo** (10 códigos:
`FIRST_ACTION`, `STREAK_3/7/14/30`, `XP_100/500/1000`, `FIRST_CHALLENGE`,
`FIRST_GROUP`). O catálogo **real e ativo** hoje é
`lib/community/achievement-catalog.ts` (57 códigos — `MEALS_10`,
`WATER_GOAL_7_DAYS`, `ACTIVITIES_50`, `BALANCED_WEEK` etc., avaliados por
`lib/community/achievement-engine.ts`). Como `def` vinha `undefined` pra
qualquer código do catálogo novo, a rota respondia
`400 { error: "Conquista inválida" }` — exatamente o sintoma relatado.

O mesmo padrão de bug existia, de forma independente, em dois outros lugares:

- `components/social/AchievementCelebration.tsx` — o toast de "Nova
  conquista" com botão "Compartilhar" também só lia `ACHIEVEMENTS` (catálogo
  antigo); pra qualquer conquista do catálogo novo, o componente retornava
  `null` e **o toast simplesmente não aparecia**, silenciosamente.
- `hooks/useAchievements.tsx` — um **segundo mecanismo de celebração**,
  independente do primeiro (dispara automaticamente sempre que
  `GET /api/achievements` retorna algo em `newlyUnlocked`), também só lia
  `ACHIEVEMENT_CATALOG` (o catálogo novo) — o problema inverso: silenciava
  pra qualquer conquista do catálogo **antigo**.

**Solução adotada — reaproveitando a arquitetura existente, sem sistema
paralelo:** nova função `getAchievementDisplay(code)` em
`lib/community/achievements.ts` (o arquivo que já concentra lógica de
conquistas), que verifica o catálogo antigo primeiro e cai pro catálogo novo
se o código não existir ali. Os três pontos (rota de criação de post,
celebração com botão de compartilhar, celebração automática) agora chamam a
mesma função — nenhuma duplicação de regra.

Por que catálogo antigo primeiro: 5 códigos existem nos dois catálogos
(`STREAK_3/7/14/30`, `FIRST_GROUP`) — no catálogo novo eles estão marcados
`COMING_SOON` (nunca avaliados pelo motor novo, decisão documentada de uma
sessão anterior: "não desbloquear com o streak antigo enquanto a regra
definitiva de dia ativo não for formalizada"). Quem realmente concede esses
códigos hoje ainda é o motor antigo, então a exibição deve refletir o texto
do catálogo antigo, não o `comingSoonReason` do novo.

**Já era seguro e não precisou de correção:** a checagem de posse
(`userAchievement.findUnique` por `userId` real da sessão, nunca do body do
cliente) já impedia — antes e depois desta correção — compartilhar uma
conquista de outro usuário ou uma nunca desbloqueada.

**Teste de regressão:** `tests/community/achievements.test.ts` (5 casos:
código só no catálogo antigo, código só no catálogo novo — a regressão real
do bug —, códigos de hidratação/`BALANCED_WEEK` ativados nesta mesma sessão,
precedência em código sobreposto, código inexistente).

### 2. Imagens cortadas no Desktop (P1)

**Arquivo:** `components/social/PostCard.tsx`, componente `PostImage`
**Causa raiz:** `className="w-full h-auto max-h-[70vh] object-cover rounded-xl"`.
Com `object-cover` dentro de uma altura que passa a ser limitada por
`max-h-[70vh]`, qualquer imagem cujo formato exigisse mais altura do que
70vh na largura do card (comum em fotos verticais 3:4, 4:5 e principalmente
9:16) tinha as bordas cortadas pra preencher a caixa — exatamente o sintoma
relatado ("imagem de publicação cortada no Desktop"). O próprio comentário
acima do componente já dizia a intenção correta ("respeita a proporção...
só limita altura em casos extremos") — a implementação não cumpria o que o
comentário descrevia.

**Solução adotada:**
```tsx
<button type="button" onClick={onOpen} className="block w-full rounded-xl overflow-hidden bg-slate-100">
  <img src={src} alt="" className="block mx-auto w-auto h-auto max-w-full max-h-[70vh] object-contain" />
</button>
```
`object-contain` nunca corta — reduz a imagem inteira mantendo a proporção
original quando ela excede `max-w-full`/`max-h-[70vh]`. O `bg-slate-100` no
container dá o fundo neutro ao redor de imagens mais estreitas que o card
(ex.: uma foto 9:16 fica centralizada, com uma faixa neutra nas laterais, em
vez de esticada). Testado mentalmente/via leitura de CSS para as proporções
1:1, 4:5, 3:4, 4:3, 16:9 e 9:16 — todas preservam a proporção original por
construção (`object-contain` + `w-auto h-auto` não distorce nem corta em
nenhum caso).

**Pipeline de upload já estava correto — não precisou de correção:**
investigado o fluxo completo (seleção → preview → "crop" → compressão →
upload → storage → URL → renderização, ver `components/social/PostMediaField.tsx`
→ `ImageCropDialog.tsx` → `lib/community/image-crop-utils.ts`). O editor de
imagem tem opções de proporção (`Original`, `1:1`, `4:5`, `16:9`, `Livre`),
mas o padrão selecionado é sempre **`Original`** (`computeAspect` retorna
`naturalWidth / naturalHeight` nesse caso) — ou seja, se o usuário não mexer
em nada, a "aplicação" do editor não corta absolutamente nada, só
re-codifica a imagem (webp/png, qualidade 0.88) e limita a maior dimensão a
2048px **reduzindo proporcionalmente** (nunca distorce, nunca força
dimensões fixas) — exatamente o que a tarefa definiu como aceitável
("redimensionar mantendo proporção = permitido"). O crop de fato só
acontece se o usuário escolher deliberadamente uma proporção diferente —
comportamento correto e intencional, não um bug.

**Visualizador de imagem (lightbox) já estava correto:**
`components/social/ImageViewerDialog.tsx` já usa
`max-w-full max-h-full object-contain` — clicar numa imagem pra ver
ampliada já funcionava sem cortar. Nenhuma mudança necessária.

**Mesmo padrão verificado em outros lugares (não pare na primeira causa):**
buscado `object-cover` em todo `components/`. Todas as outras ocorrências
(`Avatar.tsx`, `AppSidebar.tsx`, `NotificationsBell.tsx`, avatares em geral,
e as miniaturas de `BeforeAfterSection.tsx`/`ProgressPhotoHistoryModal.tsx`/
`AddProgressPhotoModal.tsx`) são avatares (círculo, corte intencional — todo
avatar circular corta pra preencher, é o padrão esperado) ou miniaturas de
grade de Antes & Depois (contexto de grade compacta, não a imagem principal
de uma publicação) — nenhuma delas é a "imagem de publicação" descrita no
bug relatado. Nenhuma alteração feita nesses casos.

**Comunidade e Grupos usam exatamente o mesmo componente:** não existe
`GroupPostCard` separado — `PostCard.tsx` é usado para os dois contextos, e
`PostImage` é usado nos 3 pontos de renderização de imagem dentro dele (TEXT,
ACTIVITY/EXTERNAL_SHARE, e o branch genérico). A correção se aplica
automaticamente a Comunidade Geral e a Grupos ao mesmo tempo, sem precisar
duplicar a correção.

## Inconsistências encontradas

1. **Dois mecanismos de celebração de conquista independentes e
   parcialmente duplicados** (`components/social/AchievementCelebration.tsx`
   e o efeito dentro de `hooks/useAchievements.tsx`) — um dispara manualmente
   só a partir da conclusão de refeição (`components/meal-plan-dashboard.tsx:390`)
   e tem botão "Compartilhar" embutido; o outro dispara automaticamente
   sempre que `GET /api/achievements` é reconsultado em qualquer tela, mas
   não tem atalho de compartilhamento. Ambos tinham o mesmo bug de catálogo
   (corrigido nos dois agora), mas a duplicação em si — dois lugares
   decidindo "isto é uma conquista nova, vou mostrar um toast" — continua.
   Registrado como melhoria recomendada (consolidar em um só), não
   consolidado nesta rodada por ser uma mudança de fluxo mais ampla do que o
   bug reportado exigia.
2. **Tela "Todas as conquistas" (`AchievementsModal.tsx`) não tem nenhum
   atalho de compartilhamento** — a única forma de compartilhar uma
   conquista é abrir o compositor de post e clicar em "Anexar conquista"
   (`AchievementPickerModal`), que já funciona corretamente. Não é um bug
   (o fluxo existe e funciona), mas é uma lacuna de descoberta — um usuário
   olhando a lista de conquistas não vê nenhum caminho óbvio pra
   compartilhar a partir dali.
3. **`GET /api/community/media/preview` sem nenhum consumidor no
   frontend** — ver "Código morto identificado" abaixo.

## Rotas analisadas

Inventário completo das 38 rotas sob `app/api/community/**`, cruzadas com
todo consumo real encontrado no frontend (`hooks/useCommunity.ts`,
`hooks/useCommunityMediaUpload.ts`, componentes, `middleware.ts`):

| Rota | Método(s) | Consumidor |
|---|---|---|
| `/api/community/me` | GET, PATCH | `useCommunity.ts` (`useCommunityMe`, `useUpdateCommunityProfile`, `useAcceptCommunityTerms`) |
| `/api/community/feed` | GET | `useCommunityFeed` |
| `/api/community/posts` | POST | `useCreatePost` |
| `/api/community/posts/[id]` | PATCH, DELETE | `useUpdatePost`, `useDeletePost` |
| `/api/community/posts/[id]/reactions` | POST | `useToggleReaction` |
| `/api/community/posts/[id]/feedback` | POST | `useMarkNotInterested` |
| `/api/community/posts/[id]/comments` | GET, POST | `useComments`, `useCreateComment` |
| `/api/community/posts/[id]/image` | GET | `<img>` via URL montada em `feed-items.ts` |
| `/api/community/comments/[id]` | DELETE | `useDeleteComment` |
| `/api/community/hashtags/suggest` | GET | `useHashtagSuggestions` |
| `/api/community/hashtags/[slug]` | GET | hook de detalhe de hashtag |
| `/api/community/hashtags/[slug]/posts` | GET | feed por hashtag |
| `/api/community/hashtags/[slug]/follow` | POST, DELETE | seguir/deixar de seguir hashtag |
| `/api/community/users/search` | GET | `useSearchUsers` |
| `/api/community/friends` | GET, POST | `useFriends`, `useSendFriendRequest` |
| `/api/community/friends/[id]` | PATCH, DELETE | responder/cancelar solicitação |
| `/api/community/blocks` | GET, POST | `useBlockedUsers`, `useBlockUser` |
| `/api/community/blocks/[userId]` | DELETE | `useUnblockUser` |
| `/api/community/groups` | GET, POST | listar/criar grupo |
| `/api/community/groups/[id]` | GET, PATCH, DELETE | `useGroup`, editar, excluir |
| `/api/community/groups/[id]/members` | GET | `useGroupMembers` |
| `/api/community/groups/[id]/members/[userId]` | PATCH, DELETE | mudar papel, remover membro |
| `/api/community/groups/[id]/leave` | POST | sair do grupo |
| `/api/community/groups/[id]/invite` | POST | gerar convite |
| `/api/community/groups/join` | POST | `app/community/invite/[code]/page.tsx` |
| `/api/community/groups/invite/[code]` | GET | ver convite (rota pública) |
| `/api/community/challenges` | GET, POST | listar/criar desafio |
| `/api/community/challenges/[id]` | DELETE | excluir desafio |
| `/api/community/challenges/[id]/join` | POST | entrar em desafio |
| `/api/community/challenges/[id]/ranking` | GET | `useChallengeRanking` |
| `/api/community/ranking` | GET | `useRanking` (`LeaderboardCard`) |
| `/api/community/gamification` | GET | resumo de XP/streak |
| `/api/community/reports` | POST | denunciar conteúdo |
| `/api/community/moderation/reports` | GET | painel de moderação |
| `/api/community/moderation/reports/[id]` | PATCH | resolver denúncia |
| `/api/community/moderation/posts/[id]/hide` | POST | ocultar post |
| `/api/community/media/upload` | POST | `useCommunityMediaUpload` |
| `/api/community/media/preview` | GET | **nenhum** — ver Código morto |

Nenhuma rota chamada pelo frontend aponta para um endpoint inexistente;
nenhum método HTTP incorreto encontrado; nenhuma divergência de nome de
parâmetro (`id` vs `postId`, `userId` vs `profileId`) encontrada nas rotas
efetivamente auditadas.

## Rotas corrigidas

- `POST /api/community/posts` — troca do lookup de conquista (`ACHIEVEMENTS` → `getAchievementDisplay`). Nenhuma mudança de contrato (request/response inalterados) — só a lógica interna de resolução do catálogo.

## Funcionalidades existentes mas não utilizadas

- **`GET /api/community/media/preview`** — implementado (streama uma
  imagem privada já enviada, antes do post existir, com checagem de
  ownership pelo pathname), mas sem nenhum consumidor no frontend hoje. O
  fluxo atual do compositor (`PostMediaField.tsx`) mostra o preview via
  `URL.createObjectURL` local (blob do navegador), nunca precisando buscar
  do servidor — o upload real só acontece no momento de publicar. O próprio
  comentário da rota ("Preview de upload ANTES do post existir") sugere que
  ela foi escrita pra um desenho anterior onde o upload acontecia antes da
  publicação. Classificado como **implementação antiga substituída, mas
  ainda presente** — não removida nesta auditoria (rota inofensiva, só
  potencialmente confusa para manutenção futura); recomendação registrada
  abaixo.

## Funcionalidades parcialmente implementadas

- **Celebração/compartilhamento de conquista fora do fluxo de refeição** —
  o disparo com botão "Compartilhar" embutido (`AchievementCelebration.tsx`)
  só é chamado a partir da conclusão de refeição
  (`components/meal-plan-dashboard.tsx`). Desbloquear uma conquista via
  hidratação, atividade física, peso, foto de progresso, etc. não dispara
  esse toast específico — só o toast mais simples de `useAchievements.tsx`
  (sem atalho de compartilhar). A funcionalidade de compartilhar continua
  acessível (via `AchievementPickerModal` no compositor), só não é
  oferecida proativamente fora do fluxo de refeição.

## Código morto identificado

- `GET /api/community/media/preview` (ver acima) — candidato a remoção numa
  task futura, depois de confirmar que nenhum fluxo em desenvolvimento
  paralelo depende dele.

## Código removido

Nenhum. Por decisão desta auditoria (task explícita: "não remova nada
automaticamente apenas por parecer não utilizado"), o único candidato claro
a código morto (`media/preview`) foi documentado, não removido.

## Refatorações realizadas

- Extraída a função `getAchievementDisplay` (única fonte de resolução de
  catálogo de conquista pra exibição), substituindo três leituras diretas
  divergentes (`app/api/community/posts/route.ts`,
  `AchievementCelebration.tsx`, `hooks/useAchievements.tsx`) por uma única
  chamada compartilhada.

## Comunidade

Feed, criação/edição/exclusão de post, reações, comentários, denúncias e
compartilhamento de conquista/atividade/plano auditados via inventário de
rotas acima. Fluxo de publicação de texto e imagem testado por leitura de
código ponta a ponta (composer → validação → upload privado → post →
invalidação de feed → renderização) — consistente e funcional. Bug de
imagem cortada corrigido (afeta Comunidade e Grupos igualmente, mesmo
componente). Bug de conquista corrigido (mesma rota serve os dois
contextos, já aceitava `groupId` opcional uniformemente).

## Grupos

Confirmado que Grupos **não duplicam** a lógica de post/feed/imagem/
conquista — usam a mesma rota (`POST /api/community/posts` com `groupId`),
o mesmo `PostCard`/`PostImage`, e o mesmo `AchievementPickerModal`. Não foi
encontrada nenhuma divergência de comportamento entre Comunidade Geral e
Grupos nos fluxos auditados (texto, imagem, conquista, comentário, curtida,
exclusão) — a arquitetura já era compartilhada corretamente antes desta
auditoria, então não houve necessidade de consolidação.

## Conquistas

Ver "Bugs corrigidos" (causa raiz completa) e "Inconsistências encontradas"
(duplicação de celebração, lacuna de descoberta na tela de conquistas).
Confirmado que a checagem de posse (`UserAchievement.findUnique` pelo
`userId` da sessão) já era segura antes desta correção — o bug era
puramente de resolução de catálogo, nunca de autorização.

## Upload de imagens

Pipeline completo investigado (avatar — auditado em tarefa anterior desta
mesma sessão — e post/comunidade nesta). Upload de post: seleção → preview
local (blob) → editor de crop (padrão "Original", não força proporção) →
canvas redimensiona proporcionalmente (máx. 2048px no maior lado, nunca
distorce) → upload privado (`lib/storage/blob.ts`, `access: "private"`,
pathname `{folder}/{userId}/{uuid}.ext`) → referenciado no post só depois de
confirmar que o segundo segmento do pathname é o próprio `userId` da sessão
→ servido via rota-proxy autenticada por visibilidade do post
(`/api/community/posts/[id]/image`). Nenhum problema de segurança
encontrado nesse pipeline. Nenhuma duplicação problemática de regras de
validação MIME/tamanho entre avatar e post — ambos usam limites e tipos
aceitos consistentes (JPEG/PNG/WebP, 5MB).

## Responsividade

**Não testado visualmente nesta rodada** — nenhuma ferramenta de automação
de navegador (Playwright ou equivalente) está disponível neste ambiente.
Revisão de código feita para os dois pontos explicitamente relatados
(cropping de imagem): a correção usa apenas unidades relativas
(`w-full`, `max-w-full`, `vh`) e nenhum breakpoint específico de
desktop/mobile — o mesmo CSS se aplica em qualquer largura de tela por
construção, sem `if (desktop)` nem altura fixa em pixels. Recomenda-se uma
validação visual manual (ou com uma sessão que tenha acesso a navegador)
nos breakpoints citados na tarefa antes de considerar este item
100% fechado.

## Banco / Prisma

Nenhuma migration foi necessária para os bugs corrigidos nesta auditoria —
ambos eram de lógica de aplicação (JS/TS), não de schema. Não foi feita uma
varredura campo-a-campo de todo o `schema.prisma` (~30 modelos) nesta
rodada — o schema já vem sendo mantido ativamente nesta mesma sessão
(hidratação, avatar, Beta) e uma auditoria completa de campos não usados em
todo o schema ficou fora do escopo praticável desta tarefa. Ver
recomendação abaixo.

## React Query / cache

Verificado especificamente o fluxo de criação de post (incluindo
compartilhamento de conquista): `useCreatePost` invalida
`["community","feed",groupId ?? "global"]` no sucesso — como esse é um
**prefixo** da chave completa usada por `useCommunityFeed`
(`["community","feed",groupId ?? "global",tab]`), a invalidação por prefixo
do React Query cobre corretamente todas as abas do feed já em cache. Não é
o problema de "chave diferente" que a tarefa pediu para verificar
especificamente (`["community-posts"]` vs `["community","posts"]"`) — as
chaves usadas neste projeto são consistentes. Compartilhar uma conquista não
invalida `["achievements"]`, o que está correto (compartilhar não
desbloqueia nada novo, só publica algo já existente).

## Autorização

Verificado em profundidade apenas os pontos diretamente relacionados aos
bugs investigados:

- Compartilhamento de conquista: `userId` sempre da sessão (`auth()`),
  nunca do corpo da requisição; posse verificada por
  `UserAchievement.findUnique({userId, achievementCode})` antes de permitir
  o post — já estava correto.
- Upload/leitura de imagem de post: ownership pelo segundo segmento do
  pathname (`{folder}/{userId}/...`), nunca confiar em pathname arbitrário
  do cliente sem essa checagem — já estava correto.

Uma auditoria linha a linha de autorização em todas as ~40 rotas de
Comunidade/Grupos não foi feita de forma exaustiva nesta rodada (fora do
escopo praticável junto com a investigação profunda dos dois bugs
principais). Ver recomendação abaixo.

## Melhorias recomendadas para outra task

1. Consolidar os dois mecanismos de celebração de conquista
   (`AchievementCelebration.tsx` + efeito em `hooks/useAchievements.tsx`)
   num só, com o botão "Compartilhar" disponível em qualquer origem de
   desbloqueio, não só conclusão de refeição.
2. Adicionar um atalho de compartilhamento direto na tela "Todas as
   conquistas" (`AchievementsModal.tsx`), hoje só acessível via compositor.
3. Confirmar que `GET /api/community/media/preview` está genuinamente sem
   uso (nenhum fluxo em desenvolvimento paralelo) e removê-la.
4. Auditoria de autorização linha a linha nas ~40 rotas de Comunidade/Grupos
   não cobertas diretamente pelos dois bugs desta rodada.
5. Varredura campo-a-campo de todo o `schema.prisma` por campos/relações não
   utilizados.
6. Validação visual real (navegador ou ferramenta de automação) da correção
   de imagem nos breakpoints 375/390/430/768/1024/1280/1440/1920px — não
   executável neste ambiente por falta de ferramenta de automação de
   navegador.
7. Considerar armazenar `imageWidth`/`imageHeight` (ou `imageAspectRatio`)
   no metadata do post — reduziria layout shift ao carregar o feed. Não
   implementado nesta rodada por não haver migration necessária nem
   problema de layout shift relatado — o navegador já resolve
   adequadamente com o CSS corrigido.

## Arquivos alterados

- `app/api/community/posts/route.ts` — troca do lookup de conquista pra `getAchievementDisplay`.
- `lib/community/achievements.ts` — nova função `getAchievementDisplay` (única fonte de resolução dos dois catálogos).
- `components/social/AchievementCelebration.tsx` — usa `getAchievementDisplay` em vez do catálogo antigo isolado.
- `hooks/useAchievements.tsx` — usa `getAchievementDisplay` em vez do catálogo novo isolado.
- `components/social/PostCard.tsx` — `PostImage` corrigido (`object-contain` + fundo neutro, nunca corta).
- `tests/community/achievements.test.ts` — novo, 5 casos de regressão do bug de catálogo.
