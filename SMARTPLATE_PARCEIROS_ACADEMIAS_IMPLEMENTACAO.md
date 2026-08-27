# SmartPlate AI — Arquitetura de Academias Parceiras, Profissionais Verificados e Benefícios

> **Documento de planejamento técnico / guia de implementação**
>
> **Projeto:** SmartPlate AI  
> **Versão do documento:** 1.0  
> **Data:** 24/08/2026  
> **Objetivo:** servir como especificação de referência para a expansão do SmartPlate após a conclusão do escopo inicial, cobrindo parceria com academias, validação de alunos, portal de parceiros, profissionais verificados, grupos oficiais, benefícios/descontos, segurança, LGPD, integrações, APIs, banco, testes e estratégia de implantação.

---

## 1. Visão do produto

A expansão de parceiros transforma o SmartPlate de um SaaS puramente B2C em uma plataforma **B2C + B2B2C**, conectando:

- usuários/alunos;
- academias parceiras;
- funcionários autorizados das academias;
- nutricionistas e, futuramente, outros profissionais;
- comunidade e gamificação;
- assinatura Premium;
- benefícios comerciais;
- integrações com sistemas de gestão de academias.

A proposta é que um aluno possa:

1. criar sua conta SmartPlate;
2. informar que treina em uma academia parceira;
3. comprovar seu vínculo por matrícula + código único, QR ou outro método;
4. receber o status de aluno verificado;
5. entrar automaticamente no grupo oficial daquela academia;
6. visualizar profissionais parceiros verificados;
7. participar de desafios e ações da academia;
8. receber o benefício comercial configurado para alunos verificados;
9. continuar com sua conta e histórico mesmo se deixar de ser aluno da academia.

A academia, por sua vez, terá um portal próprio para administrar somente os recursos pertencentes ao seu tenant.

---

# 2. Decisões arquiteturais principais

## 2.1. Um único repositório

### Recomendação inicial

Manter o SmartPlate em **um único repositório**.

No estágio atual, não é necessário criar:

- `smartplate-app`;
- `smartplate-partners`;
- `smartplate-admin`;

como repositórios independentes.

Isso geraria duplicação de:

- autenticação;
- tipos;
- schemas;
- componentes;
- validações;
- regras de negócio;
- Prisma Client;
- integração Stripe;
- deploy e CI.

### Estrutura inicial recomendada

Continuar com uma aplicação Next.js e adicionar áreas bem separadas:

```text
smartplate-ai/
├── app/
│   ├── (consumer)/
│   │   ├── mealplan/
│   │   ├── profile/
│   │   ├── community/
│   │   └── ...
│   │
│   ├── partner/
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── verification/
│   │   ├── staff/
│   │   ├── professionals/
│   │   ├── community/
│   │   ├── challenges/
│   │   ├── analytics/
│   │   └── settings/
│   │
│   ├── admin/
│   │   ├── academies/
│   │   ├── professionals/
│   │   ├── partnerships/
│   │   ├── benefits/
│   │   ├── audit/
│   │   └── integrations/
│   │
│   └── api/
│       ├── academies/
│       ├── academy-memberships/
│       ├── partner/
│       ├── admin/
│       └── integrations/
│
├── components/
│   ├── partner/
│   ├── admin/
│   ├── social/
│   └── ...
│
├── lib/
│   ├── academies/
│   ├── authorization/
│   ├── billing/
│   ├── community/
│   ├── professionals/
│   ├── audit/
│   ├── integrations/
│   └── ...
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── types/
└── tests/
```

## 2.2. Evolução futura para monorepo

Se o portal de parceiros crescer muito, transformar o mesmo repositório em monorepo:

```text
smartplate-ai/
├── apps/
│   ├── consumer/
│   ├── partners/
│   └── admin/
│
├── packages/
│   ├── database/
│   ├── auth/
│   ├── authorization/
│   ├── billing/
│   ├── ui/
│   ├── validation/
│   ├── types/
│   └── observability/
│
├── turbo.json
└── package.json
```

Endereços possíveis:

```text
app.smartplate.com.br
partners.smartplate.com.br
admin.smartplate.com.br
```

Mesmo com três aplicações/deploys, o código pode continuar em **um único repositório**.

---

# 3. Estado atual do projeto e pontos de reaproveitamento

O projeto atual já possui componentes fundamentais para essa expansão:

- Next.js 15;
- React 19;
- TypeScript;
- Clerk;
- PostgreSQL;
- Prisma;
- React Query;
- Zod;
- Stripe;
- comunidade;
- grupos;
- desafios;
- ranking;
- posts;
- moderação;
- gamificação;
- perfil social;
- beta codes;
- `PremiumGrant`;
- integração de atividades.

## 3.1. O que deve ser reaproveitado

### Comunidade

Reaproveitar:

- `CommunityGroup`;
- `GroupMember`;
- `Challenge`;
- `ChallengeParticipant`;
- `CommunityPost`;
- `CommunityComment`;
- `CommunityReaction`;
- ranking;
- gamificação;
- feed.

Não criar um segundo sistema de feed exclusivo para academias.

### Código único

O projeto já possui conceito de código Beta com:

- código de uso único;
- hash no banco;
- data de expiração;
- data de resgate;
- vínculo com usuário.

O código de ativação da academia deve seguir o mesmo princípio, mas ser um domínio separado.

### Premium

`PremiumGrant` deve continuar servindo para **concessão de acesso Premium**.

Não utilizar `PremiumGrant` para representar desconto recorrente de academia.

Motivo:

```text
TER ACESSO PREMIUM != TER DESCONTO NO PREÇO
```

São conceitos diferentes.

---

# 4. Princípios de domínio

## 4.1. Identidade não é autorização

Clerk responde:

> Quem é o usuário?

O banco do SmartPlate responde:

> O que esse usuário pode fazer?

Exemplo:

```text
Clerk userId
    ↓
Profile
    ↓
AcademyStaff
    ↓
Academy
    ↓
Permission
```

## 4.2. Academia é um tenant

Cada academia deve ser tratada como um tenant independente.

Nenhuma operação pode confiar apenas em:

```ts
academyId
```

recebido pelo frontend.

Sempre verificar:

```text
usuário autenticado
+
membership de funcionário
+
academia solicitada
+
permissão requerida
```

## 4.3. Dados de saúde são privados por padrão

Academia não deve receber automaticamente:

- peso;
- altura;
- objetivo de peso;
- refeições;
- calorias;
- macros;
- alergias;
- fotos de progresso;
- notas;
- dados de atividade privada;
- dados de integrações;
- dados nutricionais do usuário.

Vínculo com academia não significa consentimento para compartilhar dados de saúde.

## 4.4. Vínculos sobrevivem independentemente da conta da academia

Se a parceria for encerrada:

- a conta do usuário continua;
- o histórico continua;
- planos continuam;
- posts gerais continuam;
- assinatura continua;
- apenas os benefícios e permissões da parceria são alterados.

---

# 5. Atores

## 5.1. Usuário comum

Pode:

- usar SmartPlate;
- participar da comunidade;
- vincular-se a academias;
- solicitar validação;
- resgatar código de ativação;
- visualizar vínculos;
- revogar seu próprio vínculo quando permitido;
- receber benefício;
- entrar em grupo oficial.

## 5.2. Aluno verificado

É um usuário que possui:

```text
AcademyMembership.status = VERIFIED
```

e vínculo dentro da validade.

Pode receber:

- grupo oficial;
- selo/contexto de aluno;
- desafios;
- benefícios;
- conteúdo da academia;
- acesso a profissionais parceiros.

## 5.3. Funcionário da academia

Pessoa com conta SmartPlate e entrada em `AcademyStaff`.

Não confundir com aluno.

## 5.4. Nutricionista/profissional

Conta SmartPlate com um `ProfessionalProfile`.

A associação com uma academia não torna o profissional automaticamente verificado.

## 5.5. Moderador SmartPlate

Continua usando a role global da comunidade.

## 5.6. Administrador SmartPlate

Pode:

- cadastrar academias;
- suspender parceria;
- configurar benefícios;
- verificar profissionais;
- visualizar auditoria;
- gerenciar integrações;
- executar ações excepcionais.

---

# 6. Roles e permissões

## 6.1. Não ampliar `ProfileRole` para roles de academia

Manter algo como:

```prisma
enum ProfileRole {
  USER
  MODERATOR
  ADMIN
}
```

Esse enum representa autoridade global do SmartPlate/comunidade.

Criar roles específicas para academia:

```prisma
enum AcademyStaffRole {
  OWNER
  ADMIN
  STAFF
  COMMUNITY_MODERATOR
  ANALYST
}
```

## 6.2. Permissões sugeridas

Internamente, preferir checagem por permissão em vez de espalhar comparações de roles.

Exemplo:

```ts
type AcademyPermission =
  | "academy:view"
  | "academy:edit"
  | "members:view"
  | "members:create"
  | "members:update"
  | "members:revoke"
  | "codes:create"
  | "codes:revoke"
  | "requests:view"
  | "requests:approve"
  | "staff:view"
  | "staff:manage"
  | "professionals:view"
  | "professionals:manage"
  | "community:moderate"
  | "challenges:manage"
  | "analytics:view"
  | "integrations:manage";
```

### OWNER

Tudo dentro da academia, exceto ações reservadas ao SmartPlate.

### ADMIN

Quase tudo, sem:

- transferir ownership;
- encerrar parceria;
- alterar contratos;
- alterar preço/percentual de desconto sem autorização SmartPlate.

### STAFF

- consultar matrícula;
- cadastrar aluno;
- gerar código;
- aprovar solicitação;
- marcar aluno inativo.

### COMMUNITY_MODERATOR

- gerenciar posts do grupo oficial;
- moderar conteúdo do grupo;
- criar/fixar publicação;
- administrar desafios, se configurado.

### ANALYST

Somente leitura de métricas agregadas.

---

# 7. Modelo de dados proposto

> Os modelos abaixo representam a arquitetura alvo. Ajustar nomes e relações ao schema real na implementação.

---

## 7.1. Enums

```prisma
enum AcademyStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  ARCHIVED
}

enum AcademyPartnershipStatus {
  PROSPECT
  PILOT
  ACTIVE
  PAUSED
  ENDED
}

enum AcademyStaffRole {
  OWNER
  ADMIN
  STAFF
  COMMUNITY_MODERATOR
  ANALYST
}

enum AcademyStaffStatus {
  INVITED
  ACTIVE
  SUSPENDED
  REVOKED
}

enum AcademyMemberRecordStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  UNKNOWN
}

enum AcademyMembershipStatus {
  PENDING
  VERIFIED
  EXPIRED
  REVOKED
  REJECTED
}

enum AcademyVerificationMethod {
  ACTIVATION_CODE
  QR_CODE
  MANUAL_APPROVAL
  CSV_MATCH
  API_SYNC
  ADMIN_OVERRIDE
}

enum AcademyVerificationRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELED
}

enum AcademyRosterImportStatus {
  PENDING
  PROCESSING
  COMPLETED
  PARTIAL
  FAILED
}

enum AcademyBenefitType {
  PERCENT_OFF
  AMOUNT_OFF
  FIXED_PARTNER_PRICE
}

enum AcademyBenefitStatus {
  DRAFT
  ACTIVE
  PAUSED
  ENDED
}

enum ProfessionalType {
  NUTRITIONIST
  PERSONAL_TRAINER
  PHYSIOTHERAPIST
  PHYSICIAN
  OTHER
}

enum ProfessionalVerificationStatus {
  UNVERIFIED
  PENDING
  VERIFIED
  REJECTED
  SUSPENDED
  EXPIRED
}

enum AcademyProfessionalStatus {
  INVITED
  ACTIVE
  REMOVED
}

enum CommunityGroupType {
  USER_GROUP
  ACADEMY_OFFICIAL
}
```

---

# 8. Academy

```prisma
model Academy {
  id String @id @default(uuid())

  name      String
  slug      String @unique
  legalName String?

  // Opcional. Se armazenar CNPJ, tratar como dado administrativo.
  document String?

  logoUrl   String?
  website   String?

  contactEmail String?
  contactPhone String?

  city      String?
  state     String?
  country   String @default("BR")
  timezone  String @default("America/Sao_Paulo")

  status            AcademyStatus            @default(DRAFT)
  partnershipStatus AcademyPartnershipStatus @default(PROSPECT)

  partnershipStartedAt DateTime?
  partnershipEndedAt   DateTime?

  // Futuro: Clerk Organizations
  clerkOrganizationId String? @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  staff             AcademyStaff[]
  memberRecords     AcademyMemberRecord[]
  memberships       AcademyMembership[]
  activationCodes   AcademyActivationCode[]
  verificationRequests AcademyVerificationRequest[]
  rosterImports     AcademyRosterImport[]
  benefits          AcademyBenefit[]
  professionals     AcademyProfessional[]
  communityGroup    CommunityGroup?

  @@index([status])
  @@index([partnershipStatus])
}
```

---

# 9. AcademyStaff

```prisma
model AcademyStaff {
  id String @id @default(uuid())

  academyId String
  academy   Academy @relation(fields: [academyId], references: [id], onDelete: Cascade)

  userId  String
  profile Profile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  role   AcademyStaffRole
  status AcademyStaffStatus @default(INVITED)

  invitedByUserId String?
  invitedAt       DateTime @default(now())
  acceptedAt      DateTime?
  revokedAt       DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([academyId, userId])
  @@index([userId])
  @@index([academyId, status])
}
```

### Regra importante

Um funcionário pode trabalhar em mais de uma academia.

Não colocar:

```text
Profile.academyId
```

porque isso limita o usuário a uma academia.

---

# 10. Cadastro de matrículas da academia

## 10.1. AcademyMemberRecord

Representa um registro da lista da academia, mesmo antes de existir usuário SmartPlate.

```prisma
model AcademyMemberRecord {
  id String @id @default(uuid())

  academyId String
  academy   Academy @relation(fields: [academyId], references: [id], onDelete: Cascade)

  externalMemberId String
  externalMemberIdNormalized String

  status AcademyMemberRecordStatus @default(ACTIVE)

  membershipStartedAt DateTime?
  membershipEndsAt    DateTime?

  source String?
  lastSyncedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  membership     AcademyMembership?
  activationCodes AcademyActivationCode[]

  @@unique([academyId, externalMemberIdNormalized])
  @@index([academyId, status])
}
```

### Por que manter matrícula separada do vínculo SmartPlate?

Porque:

```text
aluno existe na academia
≠
aluno possui conta SmartPlate
```

Exemplo:

```text
Matrícula 000123
Status ACTIVE
Conta SmartPlate: nenhuma
```

Depois:

```text
Matrícula 000123
Status ACTIVE
Conta SmartPlate: user_xxx
```

---

# 11. Normalização de matrícula

Criar helper único:

```ts
normalizeExternalMemberId(value: string): string
```

Exemplo:

```ts
export function normalizeExternalMemberId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}
```

Não remover caracteres arbitrariamente sem conhecer o padrão da academia.

Cada academia pode futuramente possuir configuração:

```text
memberIdPattern
memberIdLabel
memberIdExample
```

Exemplo:

```json
{
  "memberIdLabel": "Matrícula",
  "memberIdExample": "0018291",
  "memberIdPattern": "^[0-9]{7}$"
}
```

Não usar regex enviada diretamente pelo cliente para validação de backend.

---

# 12. Vínculo usuário ↔ academia

```prisma
model AcademyMembership {
  id String @id @default(uuid())

  academyId String
  academy   Academy @relation(fields: [academyId], references: [id], onDelete: Cascade)

  userId  String
  profile Profile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  memberRecordId String? @unique
  memberRecord   AcademyMemberRecord? @relation(fields: [memberRecordId], references: [id], onDelete: SetNull)

  status AcademyMembershipStatus @default(PENDING)

  verificationMethod AcademyVerificationMethod?

  verifiedAt       DateTime?
  expiresAt        DateTime?
  lastRevalidatedAt DateTime?

  revokedAt     DateTime?
  revokeReason  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([academyId, userId])
  @@index([userId, status])
  @@index([academyId, status])
  @@index([expiresAt])
}
```

---

# 13. Código de ativação

## 13.1. Nunca armazenar código em texto puro

```prisma
model AcademyActivationCode {
  id String @id @default(uuid())

  academyId String
  academy   Academy @relation(fields: [academyId], references: [id], onDelete: Cascade)

  memberRecordId String
  memberRecord   AcademyMemberRecord @relation(fields: [memberRecordId], references: [id], onDelete: Cascade)

  codeHash String @unique
  codeHint String?

  isActive Boolean @default(true)

  expiresAt DateTime

  usedAt       DateTime?
  usedByUserId String?

  revokedAt DateTime?

  createdByStaffId String?

  createdAt DateTime @default(now())

  @@index([academyId, isActive])
  @@index([memberRecordId])
  @@index([expiresAt])
}
```

## 13.2. Código recomendado

Gerar usando CSPRNG:

```ts
import crypto from "node:crypto";

export function createAcademyActivationCode() {
  return crypto.randomBytes(12).toString("base64url").toUpperCase();
}
```

Pode formatar visualmente:

```text
SPGYM-K8PH-92MQ-X7DA
```

O prefixo não aumenta segurança; é apenas UX.

## 13.3. Hash

Para tokens de alta entropia gerados pelo servidor:

```ts
crypto.createHash("sha256").update(code).digest("hex");
```

é adequado para impedir armazenamento em texto puro.

Para senhas humanas, usar algoritmo próprio para senha como Argon2/bcrypt/scrypt. Código aleatório de alta entropia é outro caso.

## 13.4. Regra de uso

Código:

- vinculado a uma matrícula;
- vinculado a uma academia;
- uso único;
- curto prazo;
- revogável;
- nunca reutilizado;
- nunca aparece completo em logs;
- depois de utilizado, `usedAt != null`.

---

# 14. Validação matrícula + código

Fluxo:

```text
Usuário escolhe academia
        ↓
informa matrícula
        ↓
informa código
        ↓
normaliza matrícula
        ↓
localiza AcademyMemberRecord
        ↓
confirma status ACTIVE
        ↓
hash do código
        ↓
localiza AcademyActivationCode
        ↓
confirma:
- mesma academia
- mesma matrícula
- ativo
- não usado
- não revogado
- não expirado
        ↓
transaction
        ↓
cria AcademyMembership VERIFIED
        ↓
marca código USED
        ↓
adiciona aluno ao grupo oficial
        ↓
gera audit log
        ↓
recalcula benefício
```

Toda a operação deve ocorrer em **transação**.

---

# 15. Condições de conflito

## 15.1. Matrícula já vinculada a outra conta

Responder com erro genérico:

```text
Não foi possível validar esse vínculo.
Procure a recepção da academia.
```

Não revelar:

```text
Essa matrícula pertence ao @fulano
```

## 15.2. Usuário já vinculado

Se mesma academia + mesma matrícula:

- idempotência;
- retornar vínculo atual.

Se mesma academia + matrícula diferente:

- bloquear;
- exigir suporte/academia.

## 15.3. Código expirado

Permitir funcionário gerar novo código.

## 15.4. Código usado

Não reativar automaticamente.

## 15.5. Matrícula inativa

Não validar.

---

# 16. QR Code

O QR não deve conter dados pessoais desnecessários.

### Opção A — QR individual

```text
https://app.smartplate.com.br/join/academy/<slug>?token=<activationCode>
```

O token já identifica o registro da matrícula no servidor.

Vantagem:

- o aluno não precisa digitar código.

### Opção B — QR temporário da recepção

Um funcionário gera um QR com validade curta.

Exemplo:

```text
5 minutos
uso único
```

Pode ser útil para validação presencial.

### Não recomendado

QR fixo no balcão que automaticamente comprova que qualquer pessoa é aluno.

Esse QR pode vazar em foto.

---

# 17. Solicitação manual de vínculo

```prisma
model AcademyVerificationRequest {
  id String @id @default(uuid())

  academyId String
  academy   Academy @relation(fields: [academyId], references: [id], onDelete: Cascade)

  userId String

  externalMemberIdInput String
  externalMemberIdNormalized String

  status AcademyVerificationRequestStatus @default(PENDING)

  reviewedByStaffId String?
  reviewedAt        DateTime?
  rejectionReason   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([academyId, status])
  @@index([userId, status])
}
```

Usar apenas como fallback.

---

# 18. Revalidação

## 18.1. Por que expirar vínculo?

Sem revalidação, aluno que cancela academia pode continuar:

- com desconto;
- no grupo;
- em desafios privados;
- com selo.

## 18.2. Política inicial recomendada

```text
validade: 90 dias
```

Configuração por academia:

```text
membershipRevalidationDays = 90
```

## 18.3. Estados

```text
VERIFIED
    ↓
EXPIRED
```

ou:

```text
VERIFIED
    ↓
REVOKED
```

### EXPIRED

Vínculo perdeu validade por tempo.

Pode ser renovado.

### REVOKED

Academia ou SmartPlate removeu explicitamente.

---

# 19. Sincronização de status

Ao marcar:

```text
AcademyMemberRecord.status = INACTIVE
```

o sistema deve decidir a política.

### Recomendação

Não apagar nada.

Atualizar vínculo:

```text
AcademyMembership.status = REVOKED
revokedAt = now()
revokeReason = "ACADEMY_MEMBER_INACTIVE"
```

Executar:

- remover benefício futuro;
- retirar acesso ao grupo oficial;
- manter histórico;
- registrar auditoria.

---

# 20. Múltiplas academias

O modelo deve permitir:

```text
User
├── Academia A — VERIFIED
└── Academia B — VERIFIED
```

Isso pode ocorrer naturalmente.

### Comunidade

Usuário entra nos dois grupos.

### Desconto

Descontos **não devem ser empilhados**.

Definir:

```text
máximo 1 benefício de academia por assinatura
```

Políticas possíveis:

1. maior desconto;
2. academia selecionada pelo usuário;
3. prioridade contratual;
4. primeiro benefício aplicado até cancelamento.

### Recomendação

Manter uma seleção explícita:

```prisma
model UserPartnerBenefitSelection {
  id String @id @default(uuid())
  userId String @unique
  academyMembershipId String @unique
  selectedAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

No MVP com uma única academia parceira, isso pode ser adiado, mas o modelo não deve impedir múltiplos vínculos.

---

# 21. Grupo oficial da academia

O SmartPlate já possui `CommunityGroup`.

Não criar:

```text
AcademyPost
AcademyComment
AcademyReaction
```

se o sistema existente já cobre o caso.

## 21.1. Alteração proposta em CommunityGroup

Atualmente grupos são de usuários.

Evoluir para:

```prisma
model CommunityGroup {
  id          String   @id @default(uuid())
  name        String
  description String?

  type CommunityGroupType @default(USER_GROUP)

  ownerUserId String?
  owner       Profile? @relation(fields: [ownerUserId], references: [userId], onDelete: Cascade)

  academyId String? @unique
  academy   Academy? @relation(fields: [academyId], references: [id], onDelete: Cascade)

  inviteCode String? @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members    GroupMember[]
  posts      CommunityPost[]
  challenges Challenge[]

  @@index([ownerUserId])
  @@index([academyId])
}
```

## 21.2. Invariante

### USER_GROUP

```text
ownerUserId != null
academyId == null
```

### ACADEMY_OFFICIAL

```text
ownerUserId == null
academyId != null
```

Prisma sozinho não representa perfeitamente esse XOR.

Adicionar constraint SQL na migration:

```sql
CHECK (
  ("ownerUserId" IS NOT NULL AND "academyId" IS NULL)
  OR
  ("ownerUserId" IS NULL AND "academyId" IS NOT NULL)
)
```

---

# 22. Membership no grupo oficial

Quando:

```text
AcademyMembership → VERIFIED
```

criar:

```text
GroupMember(role = MEMBER)
```

Quando:

```text
AcademyMembership → REVOKED/EXPIRED
```

remover ou desativar o GroupMember oficial.

### Importante

Não permitir que um aluno entre no grupo oficial apenas pelo `inviteCode` comum.

Para `ACADEMY_OFFICIAL`:

```text
joinPolicy = VERIFIED_MEMBERS_ONLY
```

---

# 23. Administração do grupo da academia

Autoridade de moderação deve vir de:

```text
AcademyStaff
```

e não necessariamente de `GroupMember.role`.

Criar helper:

```ts
canModerateAcademyGroup(userId, academyId)
```

Ele consulta `AcademyStaff`.

Isso evita que a saída de um funcionário da academia deixe permissões órfãs no grupo.

---

# 24. Desafios da academia

Reaproveitar `Challenge`.

Adicionar regras:

- `scope = GROUP`;
- `groupId = academy.communityGroup.id`;
- criador autorizado por `AcademyStaff`;
- metas calculadas no servidor;
- nunca aceitar progresso informado pelo frontend;
- não exigir peso ou emagrecimento como condição;
- evitar ranking de peso/calorias.

Possíveis desafios:

```text
12 treinos no mês
150 minutos ativos na semana
5 dias de caminhada
3 dias de corrida
7 dias de rotina equilibrada
```

---

# 25. Onboarding do usuário

## 25.1. Não tornar vínculo obrigatório

Fluxo:

```text
Criar conta
    ↓
dados iniciais
    ↓
preferências
    ↓
"Você treina em uma academia parceira?"
    ↓
[Sim] [Não] [Fazer depois]
```

## 25.2. Tela de academia

```text
Buscar academia
```

Mostrar apenas:

- nome;
- logo;
- cidade;
- selo parceira.

Não mostrar detalhes administrativos.

## 25.3. Depois de escolher

```text
Você é aluno da Academia X?

Alunos verificados recebem:
✓ grupo exclusivo
✓ desafios da academia
✓ acesso aos profissionais parceiros
✓ benefício SmartPlate
```

Ações:

```text
[Validar agora]
[Fazer depois]
```

## 25.4. Métodos

```text
Tenho matrícula e código
Escanear QR
Solicitar validação
```

---

# 26. Portal de parceiros

Rota:

```text
/partner
```

No futuro:

```text
partners.smartplate.com.br
```

---

# 27. Dashboard da academia

Cards sugeridos:

```text
Alunos cadastrados
Alunos vinculados ao SmartPlate
Vínculos verificados
Vínculos expirando
Solicitações pendentes
Códigos ativos
Assinantes com benefício
Participantes do grupo
Participantes de desafios
```

Não exibir métricas de saúde agregadas sem análise legal específica.

---

# 28. Página de alunos/matrículas

Tabela:

| Matrícula | Status academia | SmartPlate | Vínculo | Validade | Ações |
|---|---|---|---|---|---|
| 0018291 | Ativo | Vinculado | Verificado | 24/11 | ... |
| 0018292 | Ativo | Não | — | — | Gerar código |
| 0018293 | Inativo | Vinculado | Revogado | — | ... |

Filtros:

- matrícula;
- status;
- vinculado/não;
- expira em breve;
- origem;
- data.

---

# 29. Ações sobre aluno

Permitidas conforme role:

```text
Criar matrícula
Editar status
Gerar código
Revogar código
Revalidar vínculo
Revogar vínculo
Visualizar histórico administrativo
```

Não permitir:

```text
Ver dieta
Ver peso
Ver fotos
Ver calorias
Ver alergias
```

---

# 30. Importação CSV

## 30.1. Modelo

```prisma
model AcademyRosterImport {
  id String @id @default(uuid())

  academyId String
  academy   Academy @relation(fields: [academyId], references: [id], onDelete: Cascade)

  uploadedByUserId String

  originalFilename String
  fileHash         String?

  status AcademyRosterImportStatus @default(PENDING)

  totalRows    Int @default(0)
  createdRows  Int @default(0)
  updatedRows  Int @default(0)
  skippedRows  Int @default(0)
  errorRows    Int @default(0)

  errorReportUrl String?

  startedAt   DateTime?
  completedAt DateTime?

  createdAt DateTime @default(now())

  @@index([academyId, createdAt])
}
```

## 30.2. Template inicial

```csv
matricula,status
0018291,ACTIVE
0018292,ACTIVE
0018293,INACTIVE
```

Evitar coletar nome, CPF e telefone no MVP se não forem necessários.

## 30.3. Regras

- máximo de arquivo;
- apenas CSV;
- encoding UTF-8;
- cabeçalhos conhecidos;
- limite de linhas;
- normalizar matrícula;
- status enumerado;
- pré-visualização antes de aplicar;
- transaction/batches;
- relatório de erros;
- arquivo bruto com retenção curta;
- não avaliar fórmulas;
- sanitizar arquivos exportados.

---

# 31. Integração futura com sistema da academia

Três níveis:

## Nível 1 — manual

- portal;
- matrícula;
- código;
- CSV.

## Nível 2 — importação recorrente

Academia envia arquivo periodicamente.

## Nível 3 — API

SmartPlate consulta/sincroniza sistema de gestão.

---

# 32. API de integração B2B

Não expor endpoints internos do portal diretamente como API pública.

Criar versão:

```text
/api/integrations/v1/academy-members
```

Autenticação:

```text
Authorization: Bearer <academy_api_key>
```

Nunca armazenar API key em texto puro.

Modelo:

```prisma
model AcademyApiCredential {
  id String @id @default(uuid())

  academyId String

  name String

  keyHash String @unique
  keyHint String

  isActive Boolean @default(true)

  lastUsedAt DateTime?
  expiresAt  DateTime?
  revokedAt  DateTime?

  createdByUserId String
  createdAt DateTime @default(now())

  @@index([academyId, isActive])
}
```

---

# 33. Endpoints de integração

## Upsert membro

```http
PUT /api/integrations/v1/members/{externalMemberId}
```

Body:

```json
{
  "status": "ACTIVE",
  "membershipStartedAt": "2026-01-01T00:00:00Z",
  "membershipEndsAt": null
}
```

## Buscar membro

```http
GET /api/integrations/v1/members/{externalMemberId}
```

## Inativar

```http
PATCH /api/integrations/v1/members/{externalMemberId}
```

```json
{
  "status": "INACTIVE"
}
```

## Sincronização em lote

```http
POST /api/integrations/v1/members/batch
```

Limitar quantidade por requisição.

---

# 34. Idempotência da API

Aceitar:

```text
Idempotency-Key
```

Criar:

```prisma
model ApiIdempotencyKey {
  id String @id @default(uuid())

  tenantType String
  tenantId   String

  key         String
  requestHash String
  responseCode Int
  responseBody Json?

  expiresAt DateTime
  createdAt DateTime @default(now())

  @@unique([tenantType, tenantId, key])
}
```

Evita duplicações quando o ERP reenvia requisição.

---

# 35. Webhooks da academia

Se necessário, SmartPlate pode receber eventos:

```text
member.created
member.updated
member.inactivated
```

Headers:

```text
X-SmartPlate-Timestamp
X-SmartPlate-Signature
X-Event-Id
```

Assinatura:

```text
HMAC-SHA256(secret, timestamp + "." + rawBody)
```

Rejeitar:

- timestamp muito antigo;
- assinatura inválida;
- `eventId` duplicado.

---

# 36. Outgoing webhooks

Futuro:

Academia pode receber:

```text
smartplate.member.linked
smartplate.member.unlinked
smartplate.member.benefit_activated
```

Nunca enviar dados de saúde.

---

# 37. Profissionais

## 37.1. ProfessionalProfile

```prisma
model ProfessionalProfile {
  id String @id @default(uuid())

  userId  String @unique
  profile Profile @relation(fields: [userId], references: [userId], onDelete: Cascade)

  type ProfessionalType

  displayName String
  bio         String?

  councilType   String?
  councilNumber String?
  councilState  String?

  verificationStatus ProfessionalVerificationStatus @default(UNVERIFIED)

  verifiedAt DateTime?
  verifiedByUserId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  academies AcademyProfessional[]
}
```

---

# 38. Verificação profissional

Uma academia pode declarar:

```text
"Dra. Ana é nossa nutricionista parceira"
```

mas somente SmartPlate concede:

```text
✓ Profissional verificado
```

Fluxo:

```text
profissional cria perfil
      ↓
informa registro
      ↓
envia comprovação se necessário
      ↓
status PENDING
      ↓
admin SmartPlate revisa
      ↓
VERIFIED / REJECTED
```

Não afirmar existência de validação automática via CRN até confirmar disponibilidade de fonte/API oficial adequada.

---

# 39. Documentos profissionais

Se documentos forem armazenados:

- storage privado;
- URLs assinadas temporárias;
- nunca colocar documento em pasta pública;
- restringir acesso a admin autorizado;
- registrar cada acesso;
- definir política de retenção;
- criptografar em repouso quando suportado;
- evitar guardar documento além do necessário.

Modelo opcional:

```prisma
model ProfessionalVerificationDocument {
  id String @id @default(uuid())

  professionalId String

  type String
  storageKey String

  uploadedAt DateTime @default(now())
  expiresAt  DateTime?
  deletedAt  DateTime?
}
```

---

# 40. Profissional ↔ academia

```prisma
model AcademyProfessional {
  id String @id @default(uuid())

  academyId String
  professionalId String

  status AcademyProfessionalStatus @default(INVITED)

  invitedByUserId String?
  invitedAt  DateTime @default(now())
  acceptedAt DateTime?
  removedAt  DateTime?

  @@unique([academyId, professionalId])
}
```

---

# 41. O que um nutricionista pode fazer no MVP

- ter perfil;
- aparecer como profissional parceiro;
- publicar no grupo;
- criar conteúdo;
- participar de desafios/ações;
- ter selo verificado;
- ser encontrado pelos alunos.

---

# 42. O que não liberar automaticamente

Não permitir apenas por ser nutricionista da academia:

- visualizar dieta do aluno;
- peso;
- macros;
- fotos;
- alergias;
- histórico;
- atividades;
- dados de integrações.

---

# 43. Consentimento de compartilhamento com profissional

Fase avançada.

Modelo sugerido:

```prisma
model ProfessionalDataConsent {
  id String @id @default(uuid())

  userId         String
  professionalId String

  scope String[]

  grantedAt DateTime @default(now())
  expiresAt DateTime?
  revokedAt DateTime?

  createdAt DateTime @default(now())

  @@index([userId, professionalId])
}
```

Scopes:

```text
profile.basic
weight.read
mealplan.read
mealplan.feedback
nutrition.summary.read
activity.summary.read
```

Evitar scope:

```text
all
```

por padrão.

---

# 44. Auditoria de acesso profissional

```prisma
model SensitiveDataAccessLog {
  id String @id @default(uuid())

  actorUserId String
  subjectUserId String

  resourceType String
  resourceId   String?

  action String

  consentId String?

  createdAt DateTime @default(now())

  @@index([subjectUserId, createdAt])
  @@index([actorUserId, createdAt])
}
```

O aluno deve conseguir ver futuramente:

```text
Quem acessou meus dados?
Quando?
Qual informação?
```

---

# 45. Benefício/desconto de academia

O benefício deve ser baseado em:

```text
AcademyMembership VERIFIED
```

e não em um cupom público conhecido.

O usuário não precisa receber:

```text
ACADEMIA20
```

como segredo.

O backend sabe:

```text
userId → membership → academy → benefit
```

---

# 46. AcademyBenefit

```prisma
model AcademyBenefit {
  id String @id @default(uuid())

  academyId String
  academy   Academy @relation(fields: [academyId], references: [id], onDelete: Cascade)

  name String

  type AcademyBenefitType

  percentOff Decimal?
  amountOffCents Int?
  currency String @default("BRL")

  // Integração Stripe
  stripeCouponId String?

  status AcademyBenefitStatus @default(DRAFT)

  startsAt DateTime
  endsAt   DateTime?

  priority Int @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([academyId, status])
}
```

---

# 47. Regras de benefício

Um benefício só é elegível se:

```text
Academy ACTIVE
AND
Partnership ACTIVE/PILOT
AND
AcademyMembership VERIFIED
AND
membership.expiresAt > now
AND
AcademyBenefit ACTIVE
AND
benefit.startsAt <= now
AND
benefit.endsAt > now OR null
```

---

# 48. Stripe

## 48.1. Aplicação do desconto

Stripe Checkout suporta aplicar desconto na sessão usando um Coupon/Promotion Code.

Para benefício de academia, preferir:

```text
discounts: [{ coupon: academyBenefit.stripeCouponId }]
```

gerado pelo backend.

Não habilitar um campo público de promoção apenas para esse caso.

## 48.2. Checkout deve derivar identidade da sessão

O endpoint atual do projeto recebe `userId` e `email` no corpo.

Antes de ampliar billing, refatorar para:

```ts
const { userId } = await auth();

if (!userId) {
  return unauthorized();
}

const profile = await prisma.profile.findUnique({
  where: { userId },
});
```

Nunca confiar em:

```json
{
  "userId": "qualquer_user_id",
  "email": "qualquer@email.com"
}
```

enviado pelo navegador.

---

# 49. Novo checkout recomendado

```http
POST /api/billing/checkout
```

Body:

```json
{
  "planType": "mes"
}
```

Backend:

1. pega usuário da sessão;
2. busca Profile;
3. busca benefício elegível;
4. valida plano;
5. busca Stripe Price;
6. aplica Coupon se houver;
7. cria Checkout Session;
8. grava metadata mínima;
9. retorna URL.

Pseudo:

```ts
const { userId } = await auth();
const profile = await requireProfile(userId);

const entitlement = await resolvePartnerBenefit(userId);
const priceId = resolvePrice(planType);

const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: priceId, quantity: 1 }],
  customer_email: profile.email,
  discounts: entitlement?.stripeCouponId
    ? [{ coupon: entitlement.stripeCouponId }]
    : undefined,
  metadata: {
    userId,
    planType,
    academyBenefitId: entitlement?.benefitId ?? "",
    academyMembershipId: entitlement?.membershipId ?? "",
  },
});
```

---

# 50. Desconto contínuo x desconto no momento do checkout

Definir regra comercial antes de implementar.

## Opção A — elegibilidade apenas no checkout

Aluno que era válido quando assinou mantém desconto até cancelar.

### Vantagem

Simples.

### Problema

Ex-aluno pode manter benefício indefinidamente.

## Opção B — elegibilidade contínua

Se vínculo expira:

```text
desconto removido na próxima renovação
```

### Recomendação

Usar opção B.

---

# 51. Subscription local

Para robustez, evoluir além de:

```text
Profile.subscriptionActive: Boolean
```

Criar uma representação local da assinatura:

```prisma
enum SubscriptionStatus {
  INCOMPLETE
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
  PAUSED
}

model BillingSubscription {
  id String @id @default(uuid())

  userId String

  provider String @default("STRIPE")

  providerCustomerId     String?
  providerSubscriptionId String @unique

  planKey String
  status SubscriptionStatus

  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?

  cancelAtPeriodEnd Boolean @default(false)

  appliedAcademyBenefitId String?
  appliedMembershipId     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, status])
}
```

Durante migração, manter campos atuais do Profile por compatibilidade e depois removê-los.

---

# 52. Webhooks Stripe

Processar no mínimo:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Não depender apenas de redirecionamento de sucesso.

---

# 53. Idempotência de webhook Stripe

```prisma
model StripeWebhookEvent {
  id String @id
  type String
  processedAt DateTime @default(now())
}
```

Antes de processar:

```text
INSERT event.id
```

Se já existir:

```text
return 200
```

Isso evita dupla aplicação.

---

# 54. Remoção de benefício

Job periódico:

```text
buscar AcademyMembership VERIFIED expirados
```

Para cada:

1. marcar EXPIRED;
2. remover do grupo oficial;
3. verificar assinatura;
4. remover desconto futuro, conforme política;
5. enviar notificação;
6. auditar.

---

# 55. PremiumGrant

Manter separado.

Exemplos:

```text
BETA_CODE → Premium grátis por X dias
ADMIN → concessão manual
PROMO_CODE → eventual promoção de acesso
```

Academy discount:

```text
preço reduzido
```

não deve virar PremiumGrant.

---

# 56. Portal global SmartPlate Admin

Rotas:

```text
/admin/academies
/admin/academies/[id]
/admin/academies/[id]/benefits
/admin/academies/[id]/staff
/admin/professionals
/admin/professionals/verifications
/admin/audit
/admin/integrations
```

---

# 57. Cadastro de academia

Somente admin SmartPlate inicialmente.

Campos:

```text
nome
slug
logo
cidade
estado
timezone
contato
status
partnershipStatus
data início
política de revalidação
```

Depois:

```text
Criar grupo oficial automaticamente
Criar benefício
Convidar owner
```

---

# 58. Onboarding da academia

Fluxo:

```text
Admin cria Academy
    ↓
sistema cria grupo ACADEMY_OFFICIAL
    ↓
admin cadastra benefício
    ↓
admin envia convite para OWNER
    ↓
owner aceita
    ↓
academia configura dados
    ↓
importa matrículas
    ↓
partnership = PILOT
    ↓
testes
    ↓
ACTIVE
```

---

# 59. Convites de funcionários

Modelo:

```prisma
model AcademyStaffInvite {
  id String @id @default(uuid())

  academyId String

  email String
  role AcademyStaffRole

  tokenHash String @unique
  tokenHint String?

  expiresAt DateTime

  acceptedAt DateTime?
  revokedAt  DateTime?

  invitedByUserId String
  createdAt DateTime @default(now())

  @@index([academyId])
}
```

O e-mail convidado deve ser validado contra a conta que aceita, salvo fluxo administrativo explícito.

---

# 60. API — catálogo público de academias

## Buscar

```http
GET /api/academies?query=refugio
```

Retornar somente:

```json
[
  {
    "id": "...",
    "name": "Academia X",
    "slug": "academia-x",
    "logoUrl": "...",
    "city": "Dourados",
    "state": "MS"
  }
]
```

Nunca retornar:

- staff;
- quantidade de alunos;
- códigos;
- matrículas;
- contato interno;
- desconto interno não público.

---

# 61. API — usuário

## Listar vínculos

```http
GET /api/me/academy-memberships
```

## Validar código

```http
POST /api/academy-memberships/verify
```

```json
{
  "academyId": "...",
  "externalMemberId": "0018291",
  "activationCode": "SPGYM-..."
}
```

## Solicitar aprovação

```http
POST /api/academy-memberships/requests
```

## Revalidar

```http
POST /api/academy-memberships/{id}/revalidate
```

## Desvincular voluntariamente

```http
DELETE /api/academy-memberships/{id}
```

Definir se isso deve revogar imediatamente benefício e grupo.

---

# 62. API — contexto do portal parceiro

```http
GET /api/partner/context
```

Retorna academias em que usuário é staff:

```json
{
  "academies": [
    {
      "id": "...",
      "name": "...",
      "role": "ADMIN",
      "permissions": ["members:view", "codes:create"]
    }
  ]
}
```

---

# 63. API — matrículas

```http
GET    /api/partner/academies/{academyId}/members
POST   /api/partner/academies/{academyId}/members
GET    /api/partner/academies/{academyId}/members/{memberId}
PATCH  /api/partner/academies/{academyId}/members/{memberId}
```

---

# 64. API — códigos

```http
POST /api/partner/academies/{academyId}/members/{memberId}/activation-codes
```

Resposta:

```json
{
  "code": "SPGYM-K8PH-92MQ-X7DA",
  "expiresAt": "2026-08-26T12:00:00Z"
}
```

Essa é a **única ocasião** em que o código completo é retornado.

Depois:

```http
GET /activation-codes
```

retorna apenas hint.

Revogar:

```http
POST /api/partner/academies/{academyId}/activation-codes/{codeId}/revoke
```

---

# 65. API — solicitações

```http
GET /api/partner/academies/{academyId}/verification-requests
```

Aprovar:

```http
POST /api/partner/academies/{academyId}/verification-requests/{id}/approve
```

Rejeitar:

```http
POST /api/partner/academies/{academyId}/verification-requests/{id}/reject
```

---

# 66. API — roster import

```http
POST /api/partner/academies/{academyId}/roster-imports
GET  /api/partner/academies/{academyId}/roster-imports
GET  /api/partner/academies/{academyId}/roster-imports/{id}
```

Separar:

```text
upload
preview
confirm
```

para evitar importar arquivo errado diretamente.

---

# 67. API — staff

```http
GET    /api/partner/academies/{academyId}/staff
POST   /api/partner/academies/{academyId}/staff/invites
PATCH  /api/partner/academies/{academyId}/staff/{staffId}
DELETE /api/partner/academies/{academyId}/staff/{staffId}
```

---

# 68. API — profissionais

```http
GET  /api/partner/academies/{academyId}/professionals
POST /api/partner/academies/{academyId}/professionals/invite
DELETE /api/partner/academies/{academyId}/professionals/{id}
```

---

# 69. API — benefício

Academia visualiza:

```http
GET /api/partner/academies/{academyId}/benefit
```

Alterações comerciais devem ficar inicialmente no Admin SmartPlate:

```http
POST  /api/admin/academies/{academyId}/benefits
PATCH /api/admin/academy-benefits/{id}
```

---

# 70. API — analytics

```http
GET /api/partner/academies/{academyId}/analytics?from=&to=
```

Retornar somente dados agregados permitidos.

Exemplos:

```json
{
  "verifiedMembers": 182,
  "linkedThisMonth": 24,
  "activeBenefits": 61,
  "communityMembers": 155,
  "challengeParticipants": 74
}
```

Não incluir peso/calorias.

---

# 71. Helpers de autorização

Criar fonte única:

```text
lib/authorization/academy.ts
```

Exemplo:

```ts
export async function requireAcademyPermission(
  userId: string,
  academyId: string,
  permission: AcademyPermission
) {
  const staff = await prisma.academyStaff.findUnique({
    where: {
      academyId_userId: { academyId, userId }
    }
  });

  if (!staff || staff.status !== "ACTIVE") {
    throw new ForbiddenError();
  }

  if (!hasPermission(staff.role, permission)) {
    throw new ForbiddenError();
  }

  return staff;
}
```

---

# 72. Não confiar no frontend

Errado:

```ts
const academyId = body.academyId;

return prisma.academyMemberRecord.findMany({
  where: { academyId }
});
```

Correto:

```ts
const { userId } = await auth();
await requireAcademyPermission(userId, academyId, "members:view");

return prisma.academyMemberRecord.findMany({
  where: { academyId }
});
```

---

# 73. Middleware

Middleware pode proteger:

```text
/partner
/admin
```

mas não deve ser a única camada.

Cada endpoint precisa autorizar internamente.

### Recomendações para arquitetura atual

O projeto atualmente consulta `/api/check-subscription` pelo middleware para algumas páginas.

Ao evoluir arquitetura:

- evitar `fetch` interno do middleware para verificar regra de negócio;
- centralizar Premium em `resolvePremiumAccess`;
- usar guards server-side;
- não executar lógica de tenant somente no middleware;
- nunca proteger API apenas com ocultação de rota no frontend.

---

# 74. Clerk Organizations — usar ou não?

## Opção 1 — DB-first

### Recomendação inicial

Clerk somente para identidade.

SmartPlate mantém:

```text
Academy
AcademyStaff
role
permissions
```

Vantagens:

- integra melhor ao código atual;
- domínio permanece sob controle;
- menor dependência do fornecedor;
- sem sincronização dupla.

## Opção 2 — Clerk Organizations

Clerk Organizations oferece estrutura multi-tenant com memberships, roles e permissions.

Pode ser adotado futuramente.

Nesse cenário:

```text
Academy.clerkOrganizationId
```

mapeia tenant SmartPlate ↔ Clerk.

### Regra

Nunca manter duas fontes independentes conflitantes.

Definir claramente:

```text
Clerk → identidade / membership de autenticação
SmartPlate DB → domínio e recursos
```

e ter sincronização consistente.

---

# 75. Segurança de códigos

## Rate limit

Endpoints de validação:

```text
por IP
por usuário
por academia
por matrícula normalizada
```

Exemplo inicial:

```text
5 tentativas/minuto por usuário
20/hora por matrícula
```

Ajustar com monitoramento.

## Anti-enumeração

Evitar respostas diferentes:

```text
"Matrícula não existe"
"Código incorreto"
"Essa matrícula pertence a outro usuário"
```

Prefira:

```text
"Não foi possível validar os dados informados."
```

e logs internos com motivo real.

---

# 76. Auditoria

Criar ledger administrativo.

```prisma
model AuditLog {
  id String @id @default(uuid())

  actorUserId String?

  tenantType String?
  tenantId   String?

  action String

  targetType String
  targetId   String?

  metadata Json?

  ipHash    String?
  userAgent String?

  createdAt DateTime @default(now())

  @@index([tenantType, tenantId, createdAt])
  @@index([actorUserId, createdAt])
  @@index([targetType, targetId])
}
```

Ações:

```text
ACADEMY_CREATED
ACADEMY_UPDATED
STAFF_INVITED
STAFF_ROLE_CHANGED
MEMBER_CREATED
MEMBER_STATUS_CHANGED
ACTIVATION_CODE_CREATED
ACTIVATION_CODE_REVOKED
MEMBERSHIP_VERIFIED
MEMBERSHIP_REVOKED
VERIFICATION_APPROVED
VERIFICATION_REJECTED
ROSTER_IMPORTED
BENEFIT_CREATED
BENEFIT_CHANGED
PROFESSIONAL_VERIFIED
PROFESSIONAL_SUSPENDED
API_KEY_CREATED
API_KEY_REVOKED
```

Nunca guardar código completo no metadata.

**Implementado em 2026-08-26** — o model `AuditLog` acima já existe no schema real (migration `20260826120000_add_admin_panel_beta_premium_audit`), criado para o painel `/admin` de Beta/Premium (`lib/admin/audit.ts`, ações `BETA_BATCH_CREATED`/`BETA_CODE_DISABLED`/`PREMIUM_GRANT_REVOKED`, `tenantType`/`tenantId` nulos por enquanto). Quando a auditoria de academias/parceiros desta seção for implementada, deve reaproveitar esta MESMA tabela (preenchendo `tenantType`/`tenantId`) em vez de criar uma segunda tabela de auditoria — ver `SMARTPLATE_FUTURE_FEATURES_CHECKLIST_CONQUISTAS.md`, seção 45.

---

# 77. LGPD e privacidade

> Este documento não substitui avaliação jurídica.

O SmartPlate lida com dados que podem incluir dados pessoais sensíveis relacionados à saúde.

Princípios:

- finalidade;
- adequação;
- necessidade;
- transparência;
- segurança;
- prevenção;
- responsabilização.

## 77.1. Separação de dados

### Academia pode ver

- matrícula;
- estado do vínculo;
- data da validação;
- data de expiração;
- participação no grupo quando necessário;
- status do benefício;
- analytics agregados.

### Academia não vê por padrão

- altura;
- peso;
- meta;
- calorias;
- refeições;
- alergias;
- plano;
- fotos;
- notas;
- insights privados;
- dados do Strava;
- dados médicos.

---

# 78. Retenção

Definir tabela de retenção.

Exemplo inicial:

| Dado | Retenção |
|---|---|
| activation code usado | metadados administrativos por período definido |
| código completo | nunca após geração |
| CSV original | curto prazo, ex. 7–30 dias |
| audit log | período contratual/legal definido |
| profissional docs | somente enquanto necessário |
| vínculo encerrado | histórico mínimo necessário |
| API key | hash enquanto ativa + registro de revogação |

Não definir períodos legais definitivos sem revisão adequada.

---

# 79. Consentimentos

Consentimentos devem ser:

- específicos;
- versionados;
- revogáveis;
- auditáveis.

Modelo genérico:

```prisma
model UserConsent {
  id String @id @default(uuid())

  userId String

  type String
  version Int

  grantedAt DateTime
  revokedAt DateTime?

  metadata Json?

  @@index([userId, type])
}
```

Exemplos:

```text
COMMUNITY_TERMS
PROFESSIONAL_DATA_SHARING
MARKETING
PARTNER_COMMUNITY_JOIN
```

Nem toda base legal é consentimento; consultar responsável jurídico antes de modelar juridicamente fluxos definitivos.

---

# 80. Observabilidade

Adicionar logs estruturados.

Nunca:

```ts
console.log({
  email,
  weight,
  activationCode,
  allergies
});
```

Preferir:

```json
{
  "event": "academy_membership.verify.failed",
  "academyId": "...",
  "userId": "...",
  "reason": "INVALID_CODE"
}
```

Para produção:

- Sentry ou equivalente;
- tracing;
- métricas;
- alertas;
- logs centralizados.

---

# 81. Métricas técnicas

Monitorar:

```text
academy_verification_success_total
academy_verification_failure_total
activation_code_generated_total
activation_code_redeemed_total
activation_code_expired_total
membership_expired_total
partner_checkout_total
partner_discount_applied_total
partner_discount_removed_total
academy_api_requests_total
academy_api_errors_total
roster_import_rows_total
```

---

# 82. Métricas de negócio

Por academia:

```text
alunos cadastrados
alunos SmartPlate verificados
taxa de ativação
assinantes
conversão
retenção
participação no grupo
participação em desafios
DAU/WAU do grupo
```

Não enviar métricas de saúde do aluno para dashboard comercial.

---

# 83. Jobs agendados

Criar jobs idempotentes.

## Diário

```text
expireAcademyMemberships
expireActivationCodes
expireStaffInvites
expireProfessionalVerification
```

## Horário ou conforme integração

```text
syncAcademyRosters
processRosterImports
retryPartnerWebhooks
```

## Billing

```text
reconcileStripeSubscriptions
reconcilePartnerBenefits
```

---

# 84. Eventos de domínio

Mesmo sem message broker, padronizar eventos internamente.

```text
academy.created
academy.staff.invited
academy.member.created
academy.membership.verified
academy.membership.expired
academy.membership.revoked
academy.benefit.eligible
academy.benefit.removed
academy.professional.linked
professional.verified
```

Criar funções que executam side effects.

Exemplo:

```ts
await onAcademyMembershipVerified({
  membershipId
});
```

Pode:

- entrar no grupo;
- notificar;
- recalcular benefício;
- auditar.

---

# 85. Outbox Pattern — futuro

Se houver muitas integrações:

```prisma
model OutboxEvent {
  id String @id @default(uuid())

  type String
  aggregateType String
  aggregateId String

  payload Json

  status String @default("PENDING")
  attempts Int @default(0)

  availableAt DateTime @default(now())
  processedAt DateTime?

  createdAt DateTime @default(now())
}
```

Criar evento na mesma transação do domínio.

Worker envia depois.

---

# 86. Notificações

Reaproveitar sistema existente.

Eventos:

```text
ACADEMY_MEMBERSHIP_VERIFIED
ACADEMY_MEMBERSHIP_EXPIRING
ACADEMY_MEMBERSHIP_EXPIRED
ACADEMY_VERIFICATION_REQUEST_APPROVED
ACADEMY_VERIFICATION_REQUEST_REJECTED
ACADEMY_CHALLENGE_CREATED
PROFESSIONAL_JOINED_ACADEMY
PARTNER_BENEFIT_ACTIVATED
PARTNER_BENEFIT_EXPIRING
```

---

# 87. Notificação de expiração

Exemplo:

```text
30 dias
7 dias
1 dia
```

antes.

Usuário pode renovar antes da expiração.

---

# 88. Regras de grupo após expiração

Ao expirar:

- impedir novos posts privados;
- remover membership ou marcar inativo;
- posts antigos permanecem;
- comentários antigos permanecem;
- perfil não some;
- ranking histórico não deve ser recalculado destrutivamente.

---

# 89. Exclusão da academia

Nunca fazer `DELETE CASCADE` de uma academia ativa por interface normal.

Usar:

```text
status = ARCHIVED
partnershipStatus = ENDED
```

O histórico deve continuar.

Exclusão física somente em processo administrativo controlado.

---

# 90. Suspensão da academia

```text
Academy.status = SUSPENDED
```

Efeito:

- portal bloqueado;
- novas validações bloqueadas;
- códigos bloqueados;
- grupo pode ficar read-only ou oculto;
- benefício não é aplicado a novas compras;
- revisar política para assinaturas existentes.

---

# 91. Encerramento de parceria

Fluxo:

```text
partnershipStatus = ENDED
```

Definir `endsAt`.

Comunicar:

- academia;
- usuários afetados.

Aplicar:

- grupo oficial arquivado;
- benefício encerrado;
- vínculos mantidos apenas como histórico ou revogados;
- profissionais desvinculados da academia, sem perder verificação SmartPlate.

---

# 92. Página de profissional

Perfil público:

```text
Foto
Nome
Tipo profissional
Registro
Estado
Selo verificado
Academias vinculadas
Bio
Conteúdos
```

Não expor documento de verificação.

---

# 93. Selo de academia

Possíveis estados:

```text
Parceira
Piloto
Verificada
```

Evitar usar “verificada” sem definir o que foi verificado.

Sugestão:

```text
Academia Parceira SmartPlate
```

---

# 94. UX do aluno na comunidade

Se vinculado:

```text
Comunidade
├── Para você
├── Amigos
├── Academia X
└── Meus grupos
```

Academia oficial deve ter:

- logo;
- badge;
- regras;
- profissionais;
- desafios;
- ranking;
- publicações oficiais.

---

# 95. Publicações oficiais

Adicionar opcionalmente:

```text
CommunityPost.isOfficial
```

Mas nunca aceitar esse boolean do frontend.

Backend calcula com base no autor e contexto.

Melhor modelar:

```text
authorContext:
USER
ACADEMY
PROFESSIONAL
SMARTPLATE
```

se houver necessidade real.

---

# 96. Moderação

Hierarquia:

### SmartPlate Admin/Moderator

Pode moderar todo conteúdo.

### Academy Staff com permissão

Pode moderar conteúdo **somente do grupo da própria academia**.

Não pode:

- banir globalmente;
- ver denúncias de outros grupos;
- moderar comunidade geral.

---

# 97. Banimento dentro do grupo

Futuro:

```prisma
model CommunityGroupBan {
  id String @id @default(uuid())
  groupId String
  userId String
  reason String?
  bannedByUserId String
  expiresAt DateTime?
  createdAt DateTime @default(now())

  @@unique([groupId, userId])
}
```

No grupo oficial, banir da comunidade não necessariamente revoga status de aluno.

São conceitos separados.

---

# 98. Desconto e comunidade não são a mesma permissão

Vínculo verificado pode fornecer múltiplos entitlements:

```text
ACADEMY_GROUP_ACCESS
ACADEMY_CHALLENGES
ACADEMY_BADGE
PARTNER_DISCOUNT
PROFESSIONAL_DIRECTORY
```

Futuro:

```prisma
model AcademyFeatureEntitlement {
  ...
}
```

No MVP podem ser regras em código.

---

# 99. Feature flags

Adicionar sistema simples:

```text
PARTNER_PORTAL_ENABLED
ACADEMY_VERIFICATION_ENABLED
ACADEMY_DISCOUNT_ENABLED
PROFESSIONAL_VERIFICATION_ENABLED
PROFESSIONAL_DATA_SHARING_ENABLED
```

Pode ser env inicialmente.

Por academia, usar config:

```prisma
model AcademyFeatureConfig {
  academyId String
  feature String
  enabled Boolean

  @@unique([academyId, feature])
}
```

---

# 100. Configuração por academia

Possíveis variáveis:

```text
membershipValidationEnabled
manualApprovalEnabled
qrValidationEnabled
csvImportEnabled
apiIntegrationEnabled
memberIdLabel
memberIdExample
membershipRevalidationDays
autoJoinOfficialGroup
groupRankingEnabled
challengeCreationEnabled
partnerBenefitEnabled
```

Não colocar todas como colunas prematuramente.

Usar tabela de configuração tipada ou adicionar conforme necessário.

Evitar JSON sem validação para regras críticas.

---

# 101. Status HTTP

Padronizar:

```text
200 OK
201 Created
204 No Content
400 Invalid input
401 Unauthenticated
403 Forbidden
404 Not found
409 Conflict
422 Business validation
429 Rate limit
500 Internal
```

---

# 102. Formato de erro

```json
{
  "error": {
    "code": "ACADEMY_MEMBERSHIP_VERIFICATION_FAILED",
    "message": "Não foi possível validar o vínculo.",
    "requestId": "req_..."
  }
}
```

Frontend decide texto amigável por `code`.

---

# 103. Validação Zod

Estrutura:

```text
lib/academies/validation.ts
```

Exemplos:

```ts
export const verifyMembershipSchema = z.object({
  academyId: z.string().uuid(),
  externalMemberId: z.string().min(1).max(64),
  activationCode: z.string().min(8).max(128),
});
```

Limitar tamanho de qualquer string recebida.

---

# 104. Services

Não colocar toda regra dentro de `route.ts`.

Estrutura:

```text
lib/academies/
├── membership-service.ts
├── activation-code-service.ts
├── roster-service.ts
├── benefit-service.ts
├── staff-service.ts
├── permissions.ts
├── validation.ts
├── normalization.ts
└── events.ts
```

`route.ts`:

1. auth;
2. parse;
3. authorize;
4. chamar service;
5. mapear resultado.

---

# 105. Repository layer

Não é obrigatório criar repository pattern completo agora.

Prisma pode ser usado em services.

Mas evitar queries duplicadas espalhadas.

Helpers:

```text
getVerifiedAcademyMembership()
getActiveAcademyStaff()
getEligibleAcademyBenefit()
getOfficialAcademyGroup()
```

---

# 106. Transações

Usar `$transaction` para:

## Verificação

- validar code state novamente;
- criar vínculo;
- consumir code;
- adicionar GroupMember;
- audit/outbox.

## Aprovação manual

- atualizar request;
- criar vínculo;
- vincular memberRecord;
- grupo.

## Inativação

- member status;
- membership revoke;
- entitlement;
- group membership.

---

# 107. Concorrência

Problema:

Duas requisições tentam usar mesmo código ao mesmo tempo.

Não basta:

```text
if (!usedAt) update
```

fora de transação.

Usar constraint + conditional update/transaction.

Exemplo lógico:

```text
UPDATE activation_code
SET usedAt = now()
WHERE id = ?
AND usedAt IS NULL
AND revokedAt IS NULL
```

Verificar `count == 1`.

---

# 108. Índices

Essenciais:

```text
Academy.slug unique
AcademyMemberRecord(academyId, externalMemberIdNormalized) unique
AcademyMembership(academyId, userId) unique
AcademyMembership.memberRecordId unique
AcademyActivationCode.codeHash unique
AcademyStaff(academyId, userId) unique
AcademyProfessional(academyId, professionalId) unique
```

Índices de listagem:

```text
AcademyMembership(academyId, status)
AcademyMembership(expiresAt)
AcademyMemberRecord(academyId, status)
AcademyVerificationRequest(academyId, status)
AuditLog(tenantId, createdAt)
```

---

# 109. Dados derivados

Não persistir sem necessidade:

```text
isCodeExpired
isMembershipValid
hasPartnerDiscount
```

Calcular de status + datas.

Persistir somente quando necessário para auditoria/processamento.

---

# 110. Testes unitários

Cobrir:

```text
normalizeExternalMemberId
generateActivationCode
hashActivationCode
isMembershipEligible
resolvePartnerBenefit
role → permission
benefit selection
group access
professional consent scopes
```

---

# 111. Testes de integração

Cenários:

1. código válido;
2. código inválido;
3. código expirado;
4. código usado;
5. matrícula inativa;
6. matrícula vinculada;
7. usuário já vinculado;
8. duas requisições simultâneas;
9. expiração;
10. revalidação;
11. revogação;
12. auto-join grupo;
13. remoção do grupo;
14. desconto aplicado;
15. desconto não aplicado;
16. tenant isolation;
17. staff sem permissão;
18. admin de academia A tentando ler academia B.

---

# 112. Teste multi-tenant obrigatório

Criar:

```text
Academia A
Admin A
Aluno A

Academia B
Admin B
Aluno B
```

Então testar explicitamente:

```text
Admin A GET /academy-B/members
→ 403
```

```text
Admin A PATCH memberB
→ 403
```

```text
Admin A generate code for memberB
→ 403
```

Esse conjunto é crítico.

---

# 113. E2E

Com Playwright futuramente:

```text
signup
onboarding
selecionar academia
validar matrícula
entrar grupo
checkout com desconto
portal parceiro
gerar código
aprovar solicitação
revogar aluno
```

---

# 114. Teste de segurança

Checklist:

- IDOR;
- tenant leakage;
- brute force de código;
- enumeração de matrícula;
- privilege escalation;
- role tampering;
- mass assignment;
- SQL injection;
- upload malicioso;
- webhook replay;
- API key leak;
- log leak;
- open redirect;
- CSRF quando aplicável;
- rate limit bypass.

---

# 115. Dados de teste

Seed:

```text
Academia Alpha
Academia Beta
```

Cada uma:

```text
1 owner
1 admin
1 staff
20 matrículas
10 vinculadas
5 códigos ativos
3 códigos expirados
2 solicitações
1 nutricionista
2 desafios
```

Criar estados variados.

---

# 116. Variáveis de ambiente

Exemplo:

```env
# Core
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_WEEKLY=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_YEARLY=

# App
NEXT_PUBLIC_BASE_URL=

# Security
APP_TOKEN_PEPPER=
PARTNER_API_KEY_PEPPER=
WEBHOOK_SIGNING_SECRET=

# Feature flags
PARTNER_PORTAL_ENABLED=false
ACADEMY_VERIFICATION_ENABLED=false
ACADEMY_DISCOUNT_ENABLED=false
PROFESSIONAL_VERIFICATION_ENABLED=false

# Jobs
CRON_SECRET=

# Storage
BLOB_READ_WRITE_TOKEN=
```

Não criar uma env por academia.

Config de tenant deve ficar no banco.

---

# 117. Secrets

Nunca:

- commitar `.env`;
- logar API key;
- mandar Stripe secret ao frontend;
- mandar codeHash ao frontend;
- mandar webhook secret;
- guardar chave de integração em texto puro.

---

# 118. URLs/deep links

Planejar rotas estáveis:

```text
/join/academy/[slug]
/join/academy/[slug]?token=...
/partner
/professionals/[username-or-id]
/community/groups/[groupId]
```

No mobile futuro, deep links podem mapear para essas mesmas rotas.

---

# 119. Estratégia mobile

A arquitetura de API deve ser independente do frontend web.

Evitar services que dependam de componentes Next.

Assim futuro app:

```text
Android/iOS
     ↓
mesmas APIs
     ↓
mesmo domínio
```

---

# 120. Performance

Paginar:

```text
members
audit logs
requests
imports
posts
analytics detalhados
```

Não carregar 10 mil matrículas de uma vez.

Filtros devem ocorrer no banco.

---

# 121. Cache

Pode cachear:

- catálogo público de academias;
- dados públicos da academia;
- profissionais públicos;
- analytics agregados curtos.

Não cachear indiscriminadamente:

- códigos;
- solicitações;
- dados de autorização;
- membership crítico.

---

# 122. Search

Matrículas:

- busca exata/normalizada;
- evitar `contains` amplo em tabelas enormes quando desnecessário.

Nome de academia:

- busca pública por slug/name.

---

# 123. Admin support

Criar tela de suporte com ações explícitas:

```text
detach membership
reissue activation
force revalidation
revoke benefit
restore benefit
```

Toda ação exige:

- motivo;
- audit log.

---

# 124. Impersonation

Não implementar “entrar como usuário” inicialmente.

Se um dia existir:

- extremamente restrito;
- banner persistente;
- auditoria;
- sem acesso desnecessário a saúde;
- tempo limitado.

---

# 125. Política de alteração de matrícula

Não permitir que usuário edite matrícula verificada diretamente.

Fluxo:

```text
Solicitar troca
```

ou:

```text
revogar vínculo atual
validar novo vínculo
```

---

# 126. Account deletion

Quando usuário exclui conta:

- remover/revogar AcademyMembership;
- remover GroupMember;
- invalidar benefício;
- desvincular memberRecord;
- manter apenas dados legalmente necessários/anônimos;
- permitir nova ativação da matrícula conforme política.

Não deixar `memberRecordId` preso a usuário inexistente.

---

# 127. Academy member deletion

Não apagar matrícula usada historicamente sem motivo.

Preferir:

```text
status = INACTIVE
```

---

# 128. Nome do aluno no portal

Se não for necessário, não mostrar nome.

Pode mostrar:

```text
Matrícula 0018291
SmartPlate: Vinculado
```

Se for necessário mostrar perfil social:

- somente displayName;
- avatar conforme privacidade;
- nunca e-mail.

---

# 129. Username

O username social continua único globalmente.

Não relacionar username com matrícula.

---

# 130. Analytics de conversão

Fluxo:

```text
PartnerAttribution
```

Modelo opcional:

```prisma
model PartnerAttribution {
  id String @id @default(uuid())

  userId String
  academyId String

  source String
  campaign String?

  firstTouchAt DateTime
  convertedAt  DateTime?

  @@index([academyId, firstTouchAt])
}
```

Útil para QR/landing page.

---

# 131. QR de marketing vs QR de validação

Separar.

## Marketing

```text
smartplate.com/join/academia-x
```

Pode ser público.

## Validação

```text
token secreto e temporário
```

Nunca usar um único QR para ambas as funções como prova de matrícula.

---

# 132. Referral

Futuro:

```text
academy referral
professional referral
user referral
```

Não confundir com benefício de aluno.

Atribuição comercial deve ter modelo próprio.

---

# 133. Landing page da academia

Possível:

```text
/partners/academia-x
```

Conteúdo:

- academia;
- benefício;
- comunidade;
- profissionais;
- CTA criar conta.

Pode ser usada em QR de recepção.

---

# 134. Código promocional público

Se a estratégia comercial quiser um código como:

```text
ACADEMIAX20
```

ele pode existir apenas como referral/campanha.

Não deve conceder:

- status de aluno;
- grupo privado;
- selo;
- acesso profissional.

No máximo:

- atribuição;
- desconto promocional independente, se desejado.

---

# 135. Regra principal de segurança

```text
Código promocional ≠ código de validação ≠ matrícula ≠ API key
```

Quatro conceitos separados.

---

# 136. Roadmap de implementação

## Fase 0 — pré-requisitos

Antes do módulo de parceiros:

- concluir escopo inicial;
- estabilizar onboarding;
- estabilizar Profile/SocialProfile;
- estabilizar comunidade;
- estabilizar grupos/desafios;
- estabilizar assinatura;
- corrigir autorização do checkout para derivar userId da sessão;
- centralizar Premium;
- garantir migrations limpas;
- adicionar base de testes.

---

## Fase 1 — domínio Academy

Implementar:

- enums;
- Academy;
- AcademyStaff;
- permissions;
- admin create academy;
- partner context;
- tenant isolation;
- audit log.

### Critério de aceite

Admin da academia A não acessa nada da B.

---

## Fase 2 — matrículas

Implementar:

- AcademyMemberRecord;
- CRUD;
- normalização;
- filtros;
- import CSV;
- import preview;
- auditoria.

---

## Fase 3 — validação

Implementar:

- activation code;
- hash;
- geração;
- expiração;
- verify API;
- rate limiting;
- manual request;
- approve/reject;
- AcademyMembership;
- revalidação.

---

## Fase 4 — grupo oficial

Modificar `CommunityGroup`.

Implementar:

- `ACADEMY_OFFICIAL`;
- criação automática;
- auto-join;
- saída automática;
- staff moderation;
- desafios oficiais.

---

## Fase 5 — onboarding

Implementar:

- lista de academias;
- seleção;
- validar agora/depois;
- matrícula + código;
- QR;
- status no perfil.

---

## Fase 6 — benefício

Implementar:

- AcademyBenefit;
- eligibility service;
- Stripe Coupon;
- checkout server-side;
- metadata;
- webhook idempotente;
- status local;
- expiração/reconciliação.

---

## Fase 7 — profissionais

Implementar:

- ProfessionalProfile;
- verification workflow;
- admin review;
- AcademyProfessional;
- perfil público;
- posts no grupo.

---

## Fase 8 — analytics

Implementar:

- dashboard;
- agregações;
- conversão;
- atividade da comunidade;
- export controlado.

---

## Fase 9 — integrações

Implementar:

- API credentials;
- `/api/integrations/v1`;
- idempotency;
- HMAC;
- webhooks;
- sync de ERP.

---

## Fase 10 — profissional acompanha usuário

Somente após revisão de privacidade:

- consent scopes;
- audit de acesso;
- painel profissional;
- leitura limitada;
- feedback;
- revogação instantânea.

---

# 137. Ordem de migrations sugerida

```text
001_academy_core
002_academy_staff
003_academy_members
004_academy_activation_codes
005_academy_verification_requests
006_academy_audit
007_community_group_academy_owner
008_academy_benefits
009_billing_subscription
010_professionals
011_professional_verification
012_professional_consent
013_partner_integrations
```

Não criar uma migration gigante.

---

# 138. Rollout seguro

Feature flags.

Exemplo:

```text
produção:
PARTNER_PORTAL_ENABLED=true
ACADEMY_VERIFICATION_ENABLED=true
ACADEMY_DISCOUNT_ENABLED=false
```

Primeiro validar fluxo sem mexer em billing.

Depois habilitar desconto.

---

# 139. Piloto da primeira academia

### Preparação

- criar Academy;
- definir owner;
- criar grupo;
- importar 10–20 matrículas de teste;
- testar códigos;
- testar revogação;
- testar expiração;
- testar comunidade;
- cadastrar nutricionista;
- testar selo;
- ativar benefício apenas em test mode Stripe.

### Beta controlado

- 5 alunos;
- depois 20;
- depois turma maior.

---

# 140. Critérios de aceite do piloto

## Vínculo

- matrícula não pode ser usada por duas contas;
- código não pode ser reutilizado;
- matrícula inativa não valida;
- expiração funciona;
- revogação funciona.

## Segurança

- academia A não acessa B;
- staff não vira admin por mudar request;
- usuário não informa outro userId no checkout;
- código completo não aparece no banco/log.

## Comunidade

- aluno verificado entra;
- revogado sai;
- staff modera somente próprio grupo.

## Billing

- desconto somente elegível;
- sem stacking;
- webhook consistente;
- expiração remove benefício conforme regra.

---

# 141. Possíveis edge cases

Lista que deve ser decidida/testada:

- usuário treina em duas academias;
- matrícula reutilizada pela academia depois de anos;
- academia troca sistema e muda IDs;
- aluno perde acesso à conta;
- aluno cria segunda conta;
- academia importa matrícula duplicada;
- CSV com status inválido;
- código gerado e matrícula é inativada antes do uso;
- código expirado durante submit;
- funcionário gera dois códigos para mesma matrícula;
- funcionário é removido enquanto está com portal aberto;
- owner sai da empresa;
- academia encerra parceria;
- benefício termina no meio do período;
- Stripe checkout criado antes da expiração e concluído depois;
- webhook Stripe duplicado;
- webhook fora de ordem;
- aluno revalida após desconto removido;
- profissional perde registro;
- profissional troca de academia;
- aluno revoga consentimento enquanto profissional está na página;
- grupo oficial é suspenso;
- usuário bloqueia um funcionário da academia;
- usuário é banido do grupo, mas continua aluno;
- aluno cancela SmartPlate, mas continua na academia;
- aluno cancela academia, mas continua SmartPlate;
- API externa envia eventos fora de ordem.

---

# 142. Webhook fora de ordem

Sempre comparar estado/timestamp.

Não assumir:

```text
evento recebido por último = evento mais novo
```

Stripe e integrações podem entregar/repetir eventos.

---

# 143. Jobs idempotentes

`expireAcademyMemberships()` deve poder rodar duas vezes sem problema.

Errado:

```text
dar benefício -20% toda vez
```

Correto:

```text
estado já reconciliado → no-op
```

---

# 144. Banco como fonte de verdade

### Membership

Banco SmartPlate é a fonte local.

### Academia integrada

ERP externo pode ser fonte de status da matrícula.

Guardar:

```text
lastSyncedAt
source
externalUpdatedAt
```

Definir precedência.

Exemplo:

```text
API_SYNC sobrescreve status importado manualmente
```

somente se política explicitamente definida.

---

# 145. Conflito manual vs integração

Adicionar opcionalmente:

```text
managedBy = MANUAL | CSV | API
```

Se `API`:

- portal pode bloquear edição manual;
- permitir override administrativo com expiração.

---

# 146. Cache de matrícula

Se API da academia for consultada em tempo real, não depender 100% dela no login.

Pode sincronizar status e usar cache com TTL.

Se ERP estiver offline:

```text
não revogar usuário automaticamente
```

usar último status confiável + grace period.

---

# 147. Grace period

Config opcional:

```text
membershipGracePeriodDays = 7
```

Útil quando integração falha.

Não usar grace period para código inválido.

---

# 148. Contratos de integração

Documentar:

- schema;
- autenticação;
- rate limits;
- idempotência;
- retries;
- status codes;
- versionamento;
- changelog;
- sandbox.

---

# 149. Versionamento de API

Usar:

```text
/api/integrations/v1
```

Mudança incompatível:

```text
/v2
```

Não quebrar parceiros sem janela de migração.

---

# 150. OpenAPI

Quando API B2B existir:

```text
openapi.yaml
```

Gerar documentação com:

- endpoints;
- schemas;
- erros;
- auth;
- exemplos;
- webhooks.

---

# 151. Tipos compartilhados

```text
types/academy.ts
types/professional.ts
types/billing.ts
```

Mas evitar duplicar tipos Prisma diretamente no frontend quando contêm campos sensíveis.

Criar DTOs:

```ts
export type PublicAcademyDto = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  state: string | null;
};
```

---

# 152. Nunca retornar model Prisma inteiro

Errado:

```ts
NextResponse.json(academy);
```

se Academy ganhar campos internos.

Criar serializers.

---

# 153. Serialization layer

```text
lib/academies/serializers.ts
```

Funções:

```text
toPublicAcademyDto
toPartnerAcademyDto
toMemberDto
toAdminAcademyDto
```

---

# 154. Frontend partner

Estrutura:

```text
components/partner/
├── PartnerSidebar.tsx
├── PartnerHeader.tsx
├── AcademySwitcher.tsx
├── MemberTable.tsx
├── MemberStatusBadge.tsx
├── GenerateCodeDialog.tsx
├── VerificationRequestTable.tsx
├── RosterImportDialog.tsx
├── StaffTable.tsx
├── ProfessionalTable.tsx
├── AnalyticsCards.tsx
└── AuditTimeline.tsx
```

---

# 155. React Query

Keys:

```ts
["partner-context"]
["academy", academyId]
["academy-members", academyId, filters]
["academy-verification-requests", academyId, filters]
["academy-staff", academyId]
["academy-professionals", academyId]
["academy-analytics", academyId, range]
```

Invalidar somente tenant afetado.

---

# 156. Server Components vs Client Components

Use Server Components para:

- layout;
- primeira autorização;
- dados de baixo dinamismo.

Client Components:

- tabelas interativas;
- filtros;
- mutations;
- dialogs;
- import progress.

A autorização sempre reaparece no endpoint/service.

---

# 157. Acessibilidade

Portal:

- navegação por teclado;
- labels;
- feedback de erro;
- status não baseado apenas em cor;
- confirmação para ações destrutivas;
- tabelas responsivas.

---

# 158. Ações destrutivas

Exigir confirmação para:

```text
revogar vínculo
remover staff
suspender academia
revogar API key
encerrar benefício
remover profissional
```

Mostrar consequência.

Exemplo:

```text
Revogar vínculo removerá o acesso ao grupo e o benefício da academia.
```

---

# 159. Audit UI

Na academia:

```text
Quem gerou código?
Quem aprovou aluno?
Quem revogou?
Quando?
```

No admin SmartPlate:

visão completa.

---

# 160. Exportação

Se academia exportar matrículas:

- somente dados próprios;
- autorização;
- audit;
- CSV sanitized;
- sem dados de saúde;
- rate limit.

---

# 161. Backups e recovery

Antes do piloto:

- backup PostgreSQL;
- processo de restore testado;
- migrations reversíveis quando possível;
- export de configuração;
- Stripe em test mode.

---

# 162. CI

Pipeline:

```text
install
prisma validate
typecheck
lint
unit tests
integration tests
build
```

Para migration:

- ambiente staging;
- `prisma migrate deploy`;
- smoke tests.

---

# 163. Staging

Ter ambiente:

```text
staging SmartPlate
staging DB
Stripe test
Clerk dev/test
academia fake
```

Nunca testar desconto real diretamente em produção.

---

# 164. Política de dados de teste

Não copiar dados reais de saúde para staging.

Gerar usuários fictícios.

---

# 165. Threat model resumido

## Ameaça: pessoa descobre matrícula

Mitigação:

- matrícula não autentica sozinha;
- exige código;
- rate limit.

## Ameaça: código vazado

Mitigação:

- ligado à matrícula;
- uso único;
- expira;
- pode ser revogado.

## Ameaça: staff A acessa academia B

Mitigação:

- tenant auth em backend;
- testes IDOR.

## Ameaça: cupom compartilhado

Mitigação:

- benefício aplicado server-side;
- sem código público necessário.

## Ameaça: admin de academia vê saúde

Mitigação:

- serializers;
- endpoints separados;
- nenhuma relação de dashboard retorna Profile health.

## Ameaça: API key vazada

Mitigação:

- hash;
- scopes;
- revogação;
- rate limit;
- IP allowlist opcional;
- rotação.

---

# 166. API key scopes

Futuro:

```text
members:read
members:write
members:status
webhooks:manage
```

Não criar uma chave com acesso global SmartPlate.

---

# 167. IP allowlist

Opcional para integração empresarial:

```text
allowedCidrs
```

Não usar como única segurança.

---

# 168. Rotação de chave

Permitir duas chaves temporariamente:

```text
old key
new key
```

e revogar antiga após migração.

---

# 169. CSRF e Origin

Para ações de navegador autenticadas por cookie:

- usar proteções da stack;
- validar `Origin` quando apropriado;
- `SameSite`;
- não transformar endpoints de mutação em GET.

---

# 170. CORS

API interna web:

- não abrir `*`.

API B2B server-to-server:

- CORS geralmente não é mecanismo de segurança relevante;
- autenticar por token/assinatura.

---

# 171. Limites

Definir:

```text
maxStaffPerAcademy
maxApiKeys
maxCodesPerMemberPerDay
maxRosterRows
maxImportsPerHour
maxVerificationAttempts
maxManualRequestsPerUser
```

Mesmo que altos.

---

# 172. Abuse prevention

Exemplo:

Um funcionário malicioso gera milhares de códigos.

Mitigações:

- rate limit;
- audit;
- quotas;
- alertas.

---

# 173. Alertas

Disparar alertas internos:

```text
muitos códigos falhando
muitas tentativas numa matrícula
muitos exports
API key de academia gerando erros
muitas revogações
staff role alterada
owner transferido
```

---

# 174. Transferência de ownership

Nunca deixar academia sem owner.

Fluxo:

```text
OWNER atual
    ↓
seleciona ADMIN ativo
    ↓
confirma
    ↓
transaction:
novo OWNER
antigo ADMIN
```

Audit.

---

# 175. Convite de owner inicial

Somente SmartPlate Admin deve definir owner inicial no piloto.

---

# 176. Profissional em múltiplas academias

Permitido.

```text
ProfessionalProfile
├── Academy A
├── Academy B
└── Academy C
```

Selo é global do profissional.

Associação com academia é separada.

---

# 177. Suspensão profissional

Se:

```text
verificationStatus = SUSPENDED
```

- selo some;
- acesso profissional a dados é bloqueado;
- vínculo com academias pode continuar histórico;
- posts antigos permanecem;
- acesso de consentimento deve ser interrompido.

---

# 178. Consentimento revogado

A checagem deve acontecer **em toda leitura**.

Não basta validar uma vez no login.

```ts
await requireProfessionalConsent({
  subjectUserId,
  professionalId,
  scope: "mealplan.read"
});
```

---

# 179. Plano acompanhado por nutricionista — futuro

Não sobrescrever plano de IA silenciosamente.

Criar entidade própria:

```text
ProfessionalPlanReview
```

Com:

- autor;
- plano;
- comentário;
- status;
- versão;
- timestamps.

Possível selo:

```text
Revisado por profissional
```

somente quando de fato revisado.

---

# 180. Responsabilidade de IA

Conteúdo gerado por IA deve continuar identificado adequadamente.

Não apresentar como prescrição do nutricionista se não foi revisado.

---

# 181. Directory de profissionais

Filtro:

```text
minha academia
tipo
verificado
```

Não usar ranking comercial enganoso.

---

# 182. Mensageria com profissional

Não implementar chat de saúde no MVP sem necessidade.

Chat introduz:

- retenção;
- moderação;
- anexos;
- segurança;
- expectativa clínica;
- notificações;
- suporte.

Tratar como projeto separado.

---

# 183. Termos da academia

Grupo oficial pode ter regras próprias adicionais, mas não pode substituir Regras da Comunidade SmartPlate.

```text
SmartPlate Community Rules
+
Academy Group Rules
```

---

# 184. Dados públicos vs privados

Criar classificação:

```text
PUBLIC
INTERNAL
PERSONAL
SENSITIVE
SECRET
```

Exemplo:

```text
Academy.name → PUBLIC
AcademyStaff role → INTERNAL
externalMemberId → PERSONAL/INTERNAL
WeightLog → SENSITIVE
activationCode → SECRET
API key → SECRET
```

---

# 185. Logging policy por classificação

```text
PUBLIC → permitido
INTERNAL → somente quando necessário
PERSONAL → evitar
SENSITIVE → não logar
SECRET → nunca logar
```

---

# 186. Backup encryption

Garantir que provider de banco/storage use criptografia em repouso.

Controlar acesso administrativo.

---

# 187. Prisma migrations

Depois de adicionar modelos:

```bash
npx prisma format
npx prisma validate
npx prisma migrate dev --name academy_core
npm run build
```

Produção:

```bash
npx prisma migrate deploy
```

Não usar `db push` como fluxo principal de produção.

---

# 188. Data migration do CommunityGroup

Ao tornar `ownerUserId` opcional:

1. adicionar enum/type;
2. adicionar `academyId`;
3. tornar `ownerUserId` nullable;
4. definir grupos atuais como `USER_GROUP`;
5. adicionar CHECK constraint;
6. criar grupos de academia depois.

Nunca transformar grupos existentes em massa sem tipo explícito.

---

# 189. Migração billing

Antes:

```text
Profile.subscriptionActive
Profile.stripeSubscriptionId
Profile.subscriptionTier
```

Depois, transição:

```text
BillingSubscription
```

Plano:

1. criar tabela;
2. backfill assinaturas;
3. webhooks escrevem nos dois;
4. leitura usa novo resolver;
5. remover legado somente após estabilidade.

---

# 190. Resolver central de acesso Premium

Manter conceito:

```ts
resolvePremiumAccess(userId)
```

Depois:

```text
BillingSubscription ativa
OR
PremiumGrant ativo
```

Partner discount não entra como fonte de acesso separado; ele altera preço de uma assinatura.

---

# 191. Resolver central de benefício

```ts
resolvePartnerBenefit(userId)
```

Retorna:

```ts
type PartnerBenefitResolution = {
  eligible: boolean;
  academyId: string | null;
  membershipId: string | null;
  benefitId: string | null;
  stripeCouponId: string | null;
  reason:
    | "ELIGIBLE"
    | "NO_MEMBERSHIP"
    | "MEMBERSHIP_EXPIRED"
    | "ACADEMY_INACTIVE"
    | "PARTNERSHIP_INACTIVE"
    | "NO_ACTIVE_BENEFIT";
};
```

---

# 192. Página do perfil do usuário

Adicionar seção:

```text
Academias

Academia X
✓ Aluno verificado
Matrícula ••••291
Válido até 24/11/2026

[Gerenciar vínculo]
```

Nunca mostrar matrícula completa publicamente.

---

# 193. Selo social de aluno

Cuidado com privacidade.

Não colocar automaticamente no perfil público:

```text
Aluno da Academia X
```

Oferecer configuração:

```text
Mostrar academia no meu perfil
```

O grupo ainda pode identificar membership internamente.

---

# 194. Ranking da academia

Ranking deve respeitar as regras de gamificação existentes.

Não incluir:

- peso perdido;
- IMC;
- calorias ingeridas;
- déficit;
- medidas corporais.

---

# 195. Desafios patrocinados

Futuro:

```text
ChallengeSponsor
```

Mas não misturar publicidade com verificação de aluno no MVP.

---

# 196. Benefit abuse

Usuário pode tentar:

1. validar;
2. assinar com desconto;
3. desvincular;
4. validar outra academia.

Política contínua + não stacking reduz abuso.

Registrar histórico de benefício.

---

# 197. Histórico de benefício

```prisma
model AcademyBenefitRedemption {
  id String @id @default(uuid())

  userId String
  academyId String
  membershipId String
  benefitId String

  stripeSubscriptionId String?

  appliedAt DateTime
  removedAt DateTime?

  removalReason String?

  @@index([userId, appliedAt])
  @@index([academyId, appliedAt])
}
```

---

# 198. Preço fixo parceiro

Se no futuro academia tiver:

```text
R$ 14,90
```

em vez de percentual, pode usar Price dedicado.

Mas aumenta catálogo Stripe.

Preferir Coupon para percentual simples quando comercialmente adequado.

---

# 199. Renovação do benefício

Quando membership revalidada:

- se assinatura ativa e benefício removido, decidir se reaplica imediatamente ou próximo ciclo;
- documentar política;
- evitar proration inesperada.

---

# 200. Customer Portal Stripe

Se usar Stripe Customer Portal:

- revisar como descontos aparecem;
- impedir que usuário altere para configuração incompatível;
- manter local subscription sync por webhook.

---

# 201. Planos elegíveis

AcademyBenefit deve poder limitar:

```text
weekly
monthly
yearly
```

Modelo opcional:

```prisma
model AcademyBenefitPlan {
  id String @id @default(uuid())
  benefitId String
  planKey String

  @@unique([benefitId, planKey])
}
```

---

# 202. Analytics e privacidade diferencial

No início, não exibir métricas com grupos muito pequenos.

Exemplo:

Se menos de 5 usuários:

```text
mostrar "<5"
```

em certos relatórios agregados para evitar reidentificação.

---

# 203. Data warehouse

Não necessário no MVP.

Começar com PostgreSQL queries/materialized aggregations.

Futuro:

- analytics store;
- event pipeline.

---

# 204. Event tracking

Eventos do produto:

```text
academy_selected
academy_verification_started
academy_verification_completed
academy_verification_failed
academy_group_opened
partner_benefit_viewed
partner_checkout_started
partner_checkout_completed
```

Não colocar dados sensíveis no payload.

---

# 205. Correlação

Use IDs técnicos.

Não enviar:

```text
weight=...
allergy=...
memberId=...
```

para analytics terceirizado sem necessidade.

---

# 206. Support runbook

Criar documento operacional:

```text
Código não funciona
Matrícula já vinculada
Aluno trocou de conta
Academia encerrou contrato
Benefício não apareceu
Webhook Stripe atrasado
ERP não sincroniza
Nutricionista pendente
```

---

# 207. Painel de health do tenant

SmartPlate Admin pode ver:

```text
último sync
API errors
última importação
webhook failures
códigos gerados
taxa de validação
```

---

# 208. Feature completeness matrix

| Recurso | MVP | Piloto | Futuro |
|---|---:|---:|---:|
| Academy | ✅ | ✅ | ✅ |
| Staff/RBAC | ✅ | ✅ | ✅ |
| Matrícula | ✅ | ✅ | ✅ |
| Código único | ✅ | ✅ | ✅ |
| QR individual | opcional | ✅ | ✅ |
| Solicitação manual | ✅ | ✅ | ✅ |
| CSV | ✅ | ✅ | ✅ |
| Grupo oficial | ✅ | ✅ | ✅ |
| Desafios | existente/reuso | ✅ | ✅ |
| Desconto | ✅ | ✅ | ✅ |
| Nutricionista verificado | ✅ | ✅ | ✅ |
| API ERP | ❌ | opcional | ✅ |
| Dados com consentimento | ❌ | ❌ | ✅ |
| Painel clínico | ❌ | ❌ | futuro |
| Chat | ❌ | ❌ | avaliar |

---

# 209. Checklist antes de começar

- [ ] Escopo inicial SmartPlate concluído
- [ ] Onboarding estabilizado
- [ ] Perfil sem mocks
- [ ] SocialProfile estabilizado
- [ ] Comunidade funcional
- [ ] Grupos funcionais
- [ ] Desafios funcionais
- [ ] Gamificação funcional
- [ ] Assinatura Stripe estabilizada
- [ ] Checkout não confia em userId do body
- [ ] Premium resolver centralizado
- [ ] Webhooks Stripe idempotentes
- [ ] Base de testes criada
- [ ] Staging disponível
- [ ] Backup/restore testado
- [ ] Política de dados revisada

---

# 210. Checklist Academy Core

- [ ] Academy model
- [ ] Academy statuses
- [ ] AcademyStaff
- [ ] AcademyStaffRole
- [ ] permission map
- [ ] requireAcademyPermission
- [ ] Admin create Academy
- [ ] Staff invite
- [ ] Partner context
- [ ] Academy switcher
- [ ] Tenant tests
- [ ] AuditLog

---

# 211. Checklist matrícula

- [ ] AcademyMemberRecord
- [ ] normalized external ID
- [ ] composite unique
- [ ] create/update
- [ ] status
- [ ] filters
- [ ] pagination
- [ ] CSV template
- [ ] preview
- [ ] import
- [ ] error report
- [ ] audit

---

# 212. Checklist validação

- [ ] AcademyActivationCode
- [ ] CSPRNG
- [ ] SHA-256 hash
- [ ] codeHint
- [ ] expiration
- [ ] revoke
- [ ] use-once
- [ ] rate limiting
- [ ] anti-enumeration
- [ ] transaction
- [ ] AcademyMembership
- [ ] manual requests
- [ ] revalidation
- [ ] expiry job
- [ ] conflict handling

---

# 213. Checklist comunidade

- [ ] CommunityGroupType
- [ ] academyId
- [ ] owner nullable
- [ ] XOR DB constraint
- [ ] group creation
- [ ] auto-join
- [ ] auto-remove
- [ ] staff moderation
- [ ] official badge
- [ ] academy challenges
- [ ] group analytics
- [ ] privacy settings

---

# 214. Checklist billing

- [ ] AcademyBenefit
- [ ] eligible plan policy
- [ ] Coupon Stripe
- [ ] server checkout
- [ ] membership eligibility
- [ ] no stacking
- [ ] BillingSubscription
- [ ] webhook events
- [ ] webhook idempotency
- [ ] continuous eligibility
- [ ] expiry reconciliation
- [ ] benefit history
- [ ] admin UI

---

# 215. Checklist profissionais

- [ ] ProfessionalProfile
- [ ] ProfessionalType
- [ ] verification workflow
- [ ] private docs
- [ ] admin review
- [ ] AcademyProfessional
- [ ] public profile
- [ ] verified badge
- [ ] moderation
- [ ] suspension

---

# 216. Checklist LGPD/security

- [ ] data classification
- [ ] tenant isolation
- [ ] least privilege
- [ ] no health data in partner portal
- [ ] audit logs
- [ ] rate limits
- [ ] secrets hashed
- [ ] private uploads
- [ ] retention
- [ ] consent versioning
- [ ] sensitive access logs
- [ ] privacy policy updated
- [ ] terms updated
- [ ] incident plan
- [ ] legal review before clinical sharing

---

# 217. Critério de “pronto para primeira academia”

O recurso está pronto para o piloto somente quando:

```text
1. uma academia pode ser criada;
2. um owner pode ser convidado;
3. staff só acessa a própria academia;
4. matrículas podem ser cadastradas/importadas;
5. código é único, seguro e expira;
6. aluno consegue validar;
7. matrícula não é vinculada a duas contas;
8. aluno entra no grupo oficial;
9. revogação retira acesso;
10. desconto só aparece para vínculo válido;
11. checkout deriva identidade da sessão;
12. webhook confirma assinatura;
13. profissional pode ser associado;
14. selo profissional depende do SmartPlate;
15. academia não enxerga dados de saúde;
16. ações sensíveis ficam auditadas;
17. fluxo foi testado em staging.
```

---

# 218. Decisões que precisam ser tomadas antes da implementação

Estas decisões são de produto/negócio, não somente de código:

1. Qual será o desconto inicial?
2. Quais planos aceitam desconto?
3. Benefício vale enquanto matrícula estiver válida ou pela vida da assinatura?
4. Revalidação será 30, 60, 90 ou 180 dias?
5. Academia pode aprovar manualmente sem código?
6. Funcionários podem cadastrar matrículas manualmente?
7. Academia poderá ver nome social do usuário ou somente matrícula?
8. Usuário pode ter múltiplas academias?
9. Qual academia fornece o desconto se tiver múltiplas?
10. Grupo oficial será obrigatório ou opt-out?
11. Ranking oficial estará habilitado por padrão?
12. Academia pode criar desafios livremente?
13. Quem pode publicar como “oficial”?
14. Qual documentação será exigida de nutricionista?
15. Qual processo SmartPlate utilizará para verificar CRN?
16. Quanto tempo documentos profissionais ficam armazenados?
17. Quem atende conflito de matrícula?
18. Como será encerramento de parceria?
19. Academia terá comissão ou apenas desconto?
20. Haverá API de ERP no piloto ou somente CSV?

---

# 219. Recomendação de MVP comercial

Para a primeira parceria:

```text
Academy
AcademyStaff
AcademyMemberRecord
AcademyActivationCode
AcademyMembership
AcademyVerificationRequest
Official CommunityGroup
AcademyBenefit
ProfessionalProfile
AcademyProfessional
```

Portal:

```text
Dashboard
Alunos
Solicitações
Códigos
Profissionais
Comunidade
```

Deixar para depois:

```text
API ERP
chat
dados clínicos
prescrição
painel nutricional completo
comissão automatizada
webhooks externos
analytics avançado
```

---

# 220. Arquitetura final resumida

```text
                           SMARTPLATE
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
      CONSUMER              PARTNER              ADMIN
          │                    │                    │
   usuário/aluno        academia/staff        SmartPlate
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                       AUTHORIZATION LAYER
                               │
                  ┌────────────┼────────────┐
                  │            │            │
              COMMUNITY     ACADEMY      BILLING
                  │            │            │
                  └────────────┼────────────┘
                               │
                           SERVICES
                               │
                         PRISMA / DB
                               │
                          POSTGRESQL
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
               STRIPE                    INTEGRATIONS
                                          ERP / CSV
```

---

# 221. Fluxo final resumido — aluno

```text
Cadastro
  ↓
Onboarding
  ↓
Seleciona academia
  ↓
Matrícula + código
  ↓
Backend valida
  ↓
AcademyMembership VERIFIED
  ↓
GroupMember criado
  ↓
Benefício elegível
  ↓
Checkout
  ↓
Stripe Coupon
  ↓
Webhook
  ↓
Assinatura ativa
```

---

# 222. Fluxo final resumido — academia

```text
SmartPlate cria academia
       ↓
Convida OWNER
       ↓
Owner entra no Partner Portal
       ↓
Importa matrículas
       ↓
Gera códigos
       ↓
Alunos validam
       ↓
Academia acompanha vínculos
       ↓
Grupo oficial recebe alunos
       ↓
Cria desafios/conteúdo
```

---

# 223. Fluxo final resumido — nutricionista

```text
Cria conta
   ↓
ProfessionalProfile
   ↓
Solicita verificação
   ↓
SmartPlate analisa
   ↓
VERIFIED
   ↓
Academia convida/vincula
   ↓
Aparece no grupo
   ↓
Publica conteúdo

FUTURO:
Aluno concede consentimento
   ↓
Profissional acessa scopes autorizados
   ↓
Toda leitura é auditada
```

---

# 224. Observações específicas do código atual

Com base na estrutura atual do SmartPlate, estas mudanças merecem atenção antes do módulo de parceiros:

## 224.1. `Profile.role`

Hoje representa papel global de comunidade/admin.

**Não utilizar esse campo para role de academia.**

## 224.2. `CommunityGroup`

Hoje possui `ownerUserId` obrigatório e `inviteCode`.

Para grupos oficiais:

- criar `type`;
- aceitar owner Academy;
- convite comum não deve conceder acesso;
- membership deve ser derivada do vínculo verificado.

## 224.3. `PremiumGrant`

Já possui `BETA_CODE`, `PROMO_CODE` e `ADMIN`.

Reaproveitar apenas para concessão de Premium, não para desconto de assinatura.

## 224.4. Beta code

O padrão de hash + uso único já implementado é uma boa referência para `AcademyActivationCode`.

## 224.5. Checkout

O endpoint atual deve deixar de confiar em `userId` e `email` enviados pelo cliente.

Isso deve ser resolvido **antes** de adicionar desconto parceiro.

## 224.6. Middleware

Evitar crescer o middleware como fonte de todas as regras.

Academy tenant authorization deve ficar em guards/services server-side.

---

# 225. Referências técnicas oficiais úteis

## Stripe

- Checkout discounts: `https://docs.stripe.com/payments/checkout/discounts`
- Checkout Session API: `https://docs.stripe.com/api/checkout/sessions/create`
- Subscription coupons/discounts: `https://docs.stripe.com/billing/subscriptions/coupons`

## Clerk

- Organizations overview: `https://clerk.com/docs/guides/organizations/overview`
- Next.js Organizations: `https://clerk.com/docs/nextjs/guides/organizations/getting-started`
- Roles and permissions: `https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions`

## LGPD / ANPD

- Portal ANPD: `https://www.gov.br/anpd/`
- Guias orientativos e materiais oficiais devem ser consultados antes de liberar compartilhamento de dados sensíveis com profissionais/parceiros.

---

# 226. Conclusão

A expansão de academias parceiras deve ser construída como um **novo domínio dentro do SmartPlate**, e não como um conjunto de hacks no perfil ou na comunidade.

A base recomendada é:

```text
Academy
AcademyStaff
AcademyMemberRecord
AcademyMembership
AcademyActivationCode
AcademyVerificationRequest
AcademyBenefit
ProfessionalProfile
AcademyProfessional
CommunityGroup ACADEMY_OFFICIAL
AuditLog
```

Os pontos mais críticos são:

1. isolamento multi-tenant;
2. validação segura de matrícula;
3. código de ativação de uso único;
4. separação entre matrícula, código de validação e desconto;
5. autorização server-side;
6. não exposição de dados de saúde para a academia;
7. separação entre Premium e desconto;
8. billing derivando identidade da sessão;
9. webhooks/idempotência;
10. auditoria;
11. profissionais verificados pelo SmartPlate;
12. consentimento explícito para qualquer acesso futuro a dados sensíveis;
13. implementação por fases e feature flags.

A primeira academia deve funcionar como piloto. O sistema deve nascer preparado para várias academias, mas o primeiro release deve manter o conjunto de funcionalidades pequeno o bastante para ser validado com usuários reais antes da expansão para integrações, dados clínicos e automações empresariais.
