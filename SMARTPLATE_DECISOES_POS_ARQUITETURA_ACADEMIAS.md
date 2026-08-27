# SmartPlate AI — Decisões Arquiteturais Após o Guia de Academias

> **Documento complementar ao:** `SMARTPLATE_PARCEIROS_ACADEMIAS_IMPLEMENTACAO.md`
>
> Este arquivo registra somente as decisões tomadas **após** a definição do guia principal de Academias, Parceiros e Profissionais.
>
> O guia anterior continua sendo a referência principal para a arquitetura do módulo de parceiros. Este documento deve ser lido como um **adendo de decisões** e não como substituto.

---

# 1. Status deste documento

## 1.1 Objetivo

Registrar as decisões consolidadas sobre:

- autenticação e uso do Clerk;
- desacoplamento entre identidade externa e domínio do SmartPlate;
- painel administrativo global do SmartPlate;
- relação entre painel Admin e painel das academias;
- ordem recomendada de implementação;
- momento correto para iniciar o Admin;
- dados necessários no onboarding inicial;
- dados que não devem ser exigidos no primeiro acesso;
- campos adicionais necessários para melhorar a personalização dos planos;
- preparação para futuras academias parceiras durante o onboarding.

## 1.2 Regra de precedência

Em caso de dúvida:

1. decisões deste documento valem para os assuntos tratados aqui;
2. o arquivo `SMARTPLATE_PARCEIROS_ACADEMIAS_IMPLEMENTACAO.md` continua válido para toda a arquitetura de parceiros;
3. implementação real deve sempre considerar o estado mais recente do repositório antes de iniciar migrations ou alterações de schema.

---

# 2. Decisão: manter o Clerk

## 2.1 Decisão atual

O SmartPlate continuará utilizando **Clerk como provedor principal de autenticação**.

Não existe motivo técnico suficiente, neste estágio, para migrar para outro sistema apenas por expectativa de aumento no número de usuários.

A arquitetura deve considerar:

```text
Clerk
  ↓
Autenticação / Identidade
  ↓
SmartPlate Backend
  ↓
Autorização / Regras de negócio
  ↓
PostgreSQL
```

## 2.2 Responsabilidade do Clerk

O Clerk deve cuidar principalmente de:

- cadastro;
- login;
- logout;
- sessão;
- recuperação de acesso;
- verificação de identidade da conta;
- provedores sociais, se utilizados;
- MFA futuramente;
- sessões/dispositivos;
- recursos B2B quando fizer sentido.

## 2.3 Responsabilidade do SmartPlate

O SmartPlate deve continuar sendo responsável por:

- perfil do usuário;
- assinatura;
- Premium;
- permissões internas;
- moderação;
- academia;
- vínculo com academia;
- nutricionistas;
- verificações profissionais;
- comunidade;
- gamificação;
- papéis administrativos;
- regras de negócio;
- autorização por tenant;
- consentimentos;
- acesso a dados.

### Regra

**Clerk responde “quem é o usuário?”.**

**SmartPlate responde “o que esse usuário pode fazer?”.**

---

# 3. Decisão: não concentrar as regras de autorização no Clerk

Os papéis e permissões do produto não devem depender exclusivamente de metadata do Clerk.

Exemplos de conceitos que pertencem ao domínio do SmartPlate:

```text
USER
MODERATOR
ADMIN

ACADEMY_OWNER
ACADEMY_ADMIN
ACADEMY_STAFF

NUTRITIONIST
VERIFIED_PROFESSIONAL
```

Esses conceitos devem ter fonte de verdade no banco e nas regras do SmartPlate.

O Clerk pode auxiliar na autenticação e, futuramente, em Organizations, mas não deve ser a única fonte de autorização do produto.

---

# 4. Decisão: Clerk Organizations pode ser usado para equipes das academias

## 4.1 Uso recomendado

Quando o módulo de parceiros amadurecer, Clerk Organizations pode ser considerado para representar a **equipe administrativa da academia**.

Exemplo:

```text
Academia X
├── Owner
├── Administrador
├── Gerente
└── Recepcionista
```

## 4.2 O que NÃO deve acontecer

Os alunos comuns da academia **não devem ser obrigatoriamente membros de uma Clerk Organization**.

A relação dos alunos com a academia deve permanecer no domínio do SmartPlate:

```text
Academy
  ↓
AcademyMembership
  ↓
User
```

Isso evita:

- dependência desnecessária do provedor;
- custo por membership B2B;
- limitações específicas do provedor;
- acoplamento entre autenticação e negócio;
- confusão entre funcionário da academia e aluno da academia.

---

# 5. Decisão: criar uma camada de abstração de autenticação

Antes que o domínio do SmartPlate cresça significativamente, deve ser criada uma camada interna de autenticação.

Sugestão:

```text
lib/
└── auth/
    ├── get-current-user.ts
    ├── require-user.ts
    ├── require-admin.ts
    ├── require-platform-permission.ts
    ├── require-academy-membership.ts
    ├── require-academy-permission.ts
    └── types.ts
```

## 5.1 Evitar

Espalhar por toda a aplicação lógica como:

```ts
const { userId } = await auth();
```

seguida diretamente por regras específicas do domínio.

## 5.2 Preferir

Funções internas como:

```ts
getCurrentUser()
requireUser()
requireAdmin()
requirePlatformPermission()
requireAcademyPermission()
```

A implementação interna pode utilizar Clerk, mas o restante da aplicação deve depender da abstração do SmartPlate.

---

# 6. Decisão: criar identificador interno do SmartPlate no futuro

## 6.1 Problema atual

Atualmente várias relações de domínio utilizam diretamente o `userId` fornecido pelo Clerk.

Isso torna o provedor de autenticação parte do modelo de domínio.

## 6.2 Direção futura

O SmartPlate deve evoluir para possuir um identificador interno independente do provedor de autenticação.

Exemplo conceitual:

```prisma
model User {
  id String @id @default(uuid())
}

model AuthIdentity {
  id             String @id @default(uuid())
  userId         String
  provider       AuthProvider
  providerUserId String

  user User @relation(fields: [userId], references: [id])

  @@unique([provider, providerUserId])
}
```

Exemplo:

```text
SmartPlate User
UUID: 8c037596-...

AuthIdentity
├── provider: CLERK
└── providerUserId: user_xxxxx
```

## 6.3 Benefício

Caso o SmartPlate um dia migre de Clerk para:

- Better Auth;
- Auth.js;
- Keycloak;
- solução enterprise;
- autenticação própria;
- outro provedor;

os dados do domínio continuam associados ao mesmo `User.id`.

Não seria necessário migrar todos os relacionamentos de:

- planos;
- refeições;
- pesos;
- atividades;
- posts;
- comentários;
- academias;
- assinaturas;
- profissionais;
- consentimentos.

## 6.4 Prioridade

Esta mudança é importante, mas **não deve interromper a finalização do escopo inicial**.

Ela deve entrar como refatoração arquitetural antes de o domínio B2B/B2B2C crescer muito.

---

# 7. Decisão: existirão dois painéis administrativos diferentes

O SmartPlate terá dois conceitos distintos:

## 7.1 Painel da academia

Destinado à equipe de cada academia parceira.

Exemplo:

```text
/partner
```

Responsabilidades:

- alunos da própria academia;
- matrículas;
- códigos de ativação;
- solicitações de vínculo;
- funcionários;
- profissionais vinculados;
- grupo oficial;
- desafios;
- benefícios;
- métricas da própria academia.

### Regra de segurança

Uma academia nunca pode consultar dados administrativos de outra academia.

Toda autorização deve ser validada no servidor.

---

## 7.2 Painel administrativo global do SmartPlate

Destinado à equipe interna da plataforma.

Exemplo:

```text
/admin
```

Esse painel controla o produto como um todo.

Escopo futuro:

```text
/admin
├── dashboard
├── users
├── subscriptions
├── premium
├── beta-codes
├── community
├── moderation
├── reports
├── challenges
├── achievements
├── academies
├── professionals
├── professional-verifications
├── benefits
├── billing
├── integrations
├── audit
├── logs
├── feature-flags
├── settings
└── system-health
```

---

# 8. Decisão: não construir o painel Admin completo agora

## 8.1 Ordem escolhida

Primeiro deve ser finalizada e estabilizada a versão inicial do SmartPlate.

Somente depois será criado o painel administrativo completo.

Motivo:

O Admin administra variáveis, entidades e regras que precisam estar suficientemente maduras.

Criá-lo cedo demais gera retrabalho quando:

- schemas mudam;
- enums mudam;
- campos são removidos;
- regras de assinatura mudam;
- regras de comunidade mudam;
- fluxos do usuário mudam;
- APIs são reestruturadas.

## 8.2 Exceção

Ferramentas administrativas mínimas necessárias para desenvolvimento e operação podem existir antes.

Exemplos:

```text
/admin/beta-codes
/admin/moderation
```

ou outras funções internas indispensáveis.

Mas isso não significa construir o Admin completo.

**Exercido em 2026-08-26**: `/admin` (dashboard com totais), `/admin/beta` e `/admin/premium` foram implementados como exatamente essa exceção — gestão de códigos Beta e `PremiumGrant` (criação de lote, desativação, revogação, auditoria), nada além disso (sem `/admin/users`, `/admin/subscriptions`, academias, billing, etc., que continuam para quando o marco da seção 9 for atingido). Ver detalhes em `SMARTPLATE_FUTURE_FEATURES_CHECKLIST_CONQUISTAS.md`, seção 45.

---

# 9. Marco para iniciar o Admin completo

O Admin completo só deve começar quando a versão inicial atingir aproximadamente este estado:

> Um usuário novo consegue criar sua conta, concluir o onboarding, utilizar as funcionalidades principais do SmartPlate, gerar e consumir seu plano, utilizar comunidade/atividade conforme o escopo, gerenciar seu perfil e realizar pagamento sem depender de mocks ou intervenção manual.

Além disso:

- principais modelos Prisma estabilizados;
- APIs principais definidas;
- permissões funcionando;
- assinatura funcionando;
- fluxo de onboarding estável;
- comunidade principal estável;
- erros críticos resolvidos;
- dados mockados eliminados nas áreas principais.

---

# 10. Ordem geral de implementação definida

A ordem recomendada passa a ser:

```text
1. Finalizar escopo inicial do SmartPlate
            ↓
2. Remover mocks e estabilizar dados reais
            ↓
3. Estabilizar banco, enums e APIs
            ↓
4. Corrigir débitos técnicos importantes
            ↓
5. Criar abstração de autenticação
            ↓
6. Avaliar desacoplamento Clerk ID → SmartPlate User ID
            ↓
7. Criar base mínima do painel Admin
            ↓
8. Implementar Academias / Parceiros
            ↓
9. Implementar painel Partner
            ↓
10. Integrar profissionais verificados
            ↓
11. Expandir Admin conforme novos módulos
            ↓
12. Evoluir analytics, billing, auditoria e operações
```

---

# 11. Decisão: o Admin completo deve crescer junto com o domínio

Não é necessário criar todos os módulos administrativos de uma vez.

Exemplo de evolução:

## Fase A — base

```text
/admin/users
/admin/subscriptions
/admin/beta
/admin/moderation
```

## Fase B — parceiros

```text
/admin/academies
/admin/professionals
/admin/benefits
/admin/partner-verifications
```

## Fase C — operação

```text
/admin/audit
/admin/logs
/admin/feature-flags
/admin/system-health
/admin/analytics
```

---

# 12. Decisão: evoluir permissões do Admin para RBAC granular

Atualmente papéis globais simples podem ser suficientes.

No futuro, o painel administrativo deve permitir divisão por funções.

Exemplo:

```text
SUPER_ADMIN
ADMIN
SUPPORT
MODERATOR
PARTNERS_MANAGER
PROFESSIONAL_REVIEWER
FINANCE
```

Permissões possíveis:

```text
users:read
users:suspend

community:read
community:moderate

academies:read
academies:manage

professionals:read
professionals:verify

billing:read
billing:manage

audit:read

system:manage
```

### Exemplo

```text
SUPPORT
├── users:read
└── subscriptions:read

MODERATOR
└── community:moderate

PARTNERS_MANAGER
├── academies:read
└── academies:manage

SUPER_ADMIN
└── *
```

Objetivo: impedir que todo funcionário administrativo receba poderes desnecessários.

**Estado em 2026-08-26**: este RBAC granular continua não implementado — é evolução futura, não necessidade real ainda (só um administrador único hoje). O painel `/admin` recém-criado (seção 8.2) usa a forma mais simples possível: reaproveita `ProfileRole.ADMIN` (o mesmo campo/enum já usado pela moderação de comunidade) via `lib/admin/authz.ts::requireAdmin()`, sem introduzir um segundo sistema de papéis nem `SUPER_ADMIN`/`SUPPORT`/etc. Ponto de extensão centralizado: se o RBAC granular vier a ser necessário, `requireAdmin()` é o único lugar a mudar — nenhuma rota do painel checa `role` diretamente.

---

# 13. Decisão: revisar o onboarding antes de aperfeiçoar ainda mais a IA

A geração de planos depende diretamente da qualidade dos dados fornecidos.

Portanto, antes de considerar a geração alimentar definitivamente pronta, o onboarding deve ser revisado.

Regra adotada:

> **Se a informação não muda o primeiro plano do usuário nem é necessária para uma função imediata, ela provavelmente não deve ser obrigatória no onboarding.**

---

# 14. Dados que devem ser coletados no onboarding inicial

## 14.1 Identidade

### Nome de exibição

Obrigatório.

Exemplo:

```text
Lucas
```

### Username

Recomendado como obrigatório porque a Comunidade faz parte do produto.

Exemplo:

```text
@lucas
```

Deve permanecer:

- único;
- normalizado;
- validado;
- sem colisões;
- com nomes reservados bloqueados.

### E-mail

Não precisa ser perguntado novamente se já for fornecido pelo sistema de autenticação.

---

# 15. Dados físicos necessários

## 15.1 Data de nascimento

Obrigatória.

Usos:

- cálculo da idade;
- cálculo energético;
- validações futuras;
- personalização.

A idade nunca deve ser salva como número fixo; deve ser derivada da data de nascimento.

## 15.2 Altura

Obrigatória.

Unidade padrão:

```text
centímetros
```

## 15.3 Peso atual

Obrigatório.

Unidade padrão:

```text
kg
```

## 15.4 Peso inicial

Não deve ser perguntado separadamente no primeiro onboarding.

Na primeira conclusão:

```text
startWeight = currentWeight
```

Depois o peso atual pode evoluir por registros de peso.

## 15.5 Peso-meta

Obrigatório quando o objetivo exigir uma referência de peso.

Pode continuar sendo coletado no onboarding.

---

# 16. Novo campo recomendado: sexo utilizado para cálculo fisiológico

Foi identificado que o onboarding atual possui:

- idade;
- altura;
- peso;
- atividade;

mas pode não possuir uma variável necessária dependendo da equação energética escolhida.

## Decisão

Adicionar um campo apropriado **somente se a fórmula utilizada pelo SmartPlate depender dele**.

Exemplo de label de UX:

```text
Sexo utilizado para cálculo nutricional
```

A interface deve explicar que o dado é utilizado para estimativas energéticas.

### Regra

Não coletar dado sensível sem finalidade técnica.

Se a fórmula escolhida no futuro não precisar desse campo, ele pode ser removido do cálculo obrigatório.

---

# 17. Objetivo do usuário

Obrigatório.

Opções mínimas:

```text
LOSE_WEIGHT
MAINTAIN_WEIGHT
GAIN_WEIGHT
```

UX:

```text
Perder peso
Manter peso
Ganhar peso
```

Esse campo deve direcionar:

- estimativa energética;
- estratégia do plano;
- metas;
- mensagens da interface.

---

# 18. Nível de atividade

Obrigatório.

Sugestão mínima:

```text
SEDENTARY
LIGHT
MODERATE
ACTIVE
```

A UX deve utilizar descrições claras para evitar que o usuário escolha apenas pelo nome.

Exemplo:

```text
Sedentário
Pouco ativo
Moderadamente ativo
Muito ativo
```

Idealmente, cada opção deve possuir uma descrição curta.

---

# 19. Dados alimentares obrigatórios

## 19.1 Tipo de alimentação

Obrigatório.

Exemplos:

```text
Sem restrição específica
Vegetariana
Vegana
Pescetariana
...
```

Deve influenciar diretamente a geração.

## 19.2 Alergias e intolerâncias

Devem ser solicitadas explicitamente.

O usuário pode responder:

```text
Nenhuma
```

ou informar uma lista.

Esses dados têm prioridade alta na geração e não podem ser tratados como simples preferência.

## 19.3 Alimentos preferidos

Devem ser coletados.

Objetivo:

- aumentar aderência;
- evitar planos genéricos;
- priorizar alimentos realmente consumidos.

Exemplo:

```text
arroz
feijão
frango
ovo
banana
carne bovina
```

## 19.4 Alimentos que não gosta / deseja evitar

Também devem ser coletados.

Exemplo:

```text
peixe
abacate
couve
```

Esses dados devem ser enviados para a geração como restrições de preferência, diferenciadas de alergias.

---

# 20. Dados sobre realidade e rotina alimentar

## 20.1 Orçamento

Obrigatório ou fortemente recomendado.

Sugestão:

```text
ECONOMIC
MODERATE
FLEXIBLE
```

UX:

```text
Econômico
Moderado
Sem restrição específica
```

Objetivo:

evitar planos incompatíveis com a realidade financeira do usuário.

## 20.2 Nível culinário

Obrigatório.

Exemplo:

```text
BEGINNER
INTERMEDIATE
ADVANCED
```

Serve para controlar:

- técnicas utilizadas;
- quantidade de etapas;
- complexidade das receitas;
- necessidade de equipamentos.

## 20.3 Tempo máximo de preparo

Recomendado como obrigatório ou selecionável com opção “não me importo”.

Exemplo:

```text
15 min
30 min
45 min
60 min
Sem limite
```

---

# 21. Novo campo recomendado: número de refeições

O SmartPlate deve perguntar quantas refeições o usuário prefere realizar no dia.

Exemplo:

```text
3
4
5
6
```

Esse campo deve influenciar diretamente a estrutura do plano.

Pode futuramente evoluir para preferências mais específicas:

```text
Café da manhã
Lanche da manhã
Almoço
Lanche da tarde
Jantar
Ceia
```

Mas o MVP pode começar apenas com quantidade.

---

# 22. Novo campo recomendado: localidade alimentar

Foi decidido adicionar contexto regional para reduzir planos irreais e excessivamente influenciados por padrões alimentares estrangeiros.

## Dados recomendados

No mínimo:

```text
country
state / region
```

Exemplo:

```text
Brasil
Mato Grosso do Sul
```

Cidade pode ser opcional.

## Objetivo

Usar a localidade para orientar:

- disponibilidade de ingredientes;
- pratos comuns;
- custo;
- sazonalidade futura;
- nomenclatura dos alimentos;
- hábitos regionais.

## Não é necessário coletar endereço

O SmartPlate não precisa de:

- rua;
- número;
- bairro;
- CEP;

para essa finalidade.

---

# 23. Campo de observações livres

Manter `additionalNotes`.

Exemplo:

```text
Prefiro refeições simples.
Levo marmita para o trabalho.
Não gosto de cozinhar pela manhã.
```

Esse campo é útil para capturar situações que o formulário estruturado não consegue antecipar.

Deve possuir limite de caracteres e passar por validação.

---

# 24. Estrutura final recomendada do onboarding

O onboarding deve ser curto, dividido em etapas.

## Etapa 1 — Identidade

Campos:

```text
displayName
username
birthDate
physiologicalSexForCalculation (se necessário)
```

Não incluir:

```text
bio
avatar
```

---

## Etapa 2 — Corpo e objetivo

Campos:

```text
height
currentWeight
targetWeight
dietGoal
```

Sistema:

```text
startWeight = currentWeight
```

---

## Etapa 3 — Rotina

Campos:

```text
activityLevel
preferredMealCount
cookingLevel
maxPrepTime
```

---

## Etapa 4 — Alimentação

Campos:

```text
dietType
allergies
preferredFoods
dislikedFoods
```

---

## Etapa 5 — Realidade do plano

Campos:

```text
budgetLevel
country
region/state
additionalNotes
```

Ao terminar:

```text
onboardingCompletedAt = now()
onboardingVersion = CURRENT_VERSION
```

---

# 25. Dados que NÃO devem ser obrigatórios no onboarding

Não exigir inicialmente:

```text
bio
foto de perfil
telefone
CPF
endereço completo
profissão
renda
fotos corporais
medidas corporais detalhadas
integração Strava
Health Connect
Apple Health
Samsung Health
dados médicos detalhados
academia não parceira
```

Esses dados podem existir depois em áreas específicas.

---

# 26. Academia no onboarding futuro

Quando o módulo de parceiros estiver implementado, adicionar uma etapa opcional.

Exemplo:

```text
Você treina em uma academia parceira?

[Procurar academia]

[Agora não]
```

## Regra

A escolha ou validação da academia **não pode bloquear o onboarding principal**.

O usuário deve conseguir terminar o cadastro sem academia.

---

# 27. Fluxo de academia parceira no onboarding

Caso o usuário selecione uma academia:

```text
Academia
   ↓
Matrícula
   ↓
Código único de ativação
   ↓
Validação
   ↓
AcademyMembership VERIFIED
```

Campos:

```text
academyId
externalMemberId
activationCode
```

O código:

- deve ser de uso único;
- deve expirar;
- deve ser armazenado como hash;
- não deve ser reutilizável;
- deve ser associado à academia;
- preferencialmente deve ser associado à matrícula.

A matrícula continua sendo identificador.

O código funciona como prova temporária de autorização.

---

# 28. Benefícios da academia não devem depender de cupom compartilhável

O benefício deve estar ligado ao vínculo validado.

Preferência arquitetural:

```text
User
  ↓
AcademyMembership VERIFIED
  ↓
PartnerBenefit
  ↓
Preço/benefício aplicável
```

Evitar depender somente de:

```text
ACADEMIA20
```

como mecanismo de autorização.

Um código promocional público pode existir para marketing, mas não deve conceder automaticamente:

- acesso a grupo privado;
- status de aluno;
- selo de membro;
- benefícios restritos.

---

# 29. Dados da academia não entram no cálculo alimentar por padrão

Ser membro de uma academia é um contexto social/comercial.

O plano alimentar do usuário não deve ser alterado apenas porque ele pertence a determinada academia.

Uma academia não deve poder definir silenciosamente:

- calorias;
- peso-meta;
- dieta;
- macros;
- restrições;
- dados de saúde.

Qualquer acompanhamento profissional futuro deve seguir regras específicas e consentimento do usuário.

---

# 30. Separação entre perfil social e dados privados

Continuar respeitando a separação existente.

## Social

Pode incluir:

```text
displayName
username
avatar
bio
streak
xp
achievements
```

conforme preferências de privacidade.

## Privado

Não deve ser automaticamente exposto:

```text
email
birthDate
height
currentWeight
targetWeight
allergies
dietGoal
subscription
progressPhotos
health data
```

Academia e comunidade não ganham acesso a esses dados por causa de membership.

---

# 31. Princípio de minimização de dados

Para cada novo campo, perguntar:

```text
1. Esse dado é realmente necessário?
2. Ele muda alguma funcionalidade?
3. Existe uma forma menos invasiva de obter o mesmo resultado?
4. Por quanto tempo precisa ser armazenado?
5. Quem realmente precisa ter acesso?
```

Se o campo não tem finalidade clara, não deve ser coletado.

---

# 32. Variáveis conceituais recomendadas

A estrutura exata deve ser definida quando o schema for revisado, mas conceitualmente o perfil deve comportar:

```text
User
├── id
├── authIdentity
├── email
└── createdAt

Profile
├── displayName
├── birthDate
├── heightCm
├── currentWeightKg
├── startWeightKg
├── targetWeightKg
├── activityLevel
├── physiologicalSexForCalculation?
├── cookingLevel
├── onboardingVersion
├── onboardingCompletedAt
└── ...

SocialProfile
├── username
├── avatarUrl
├── bio
├── timezone
└── privacySettings

UserPreferences
├── dietGoal
├── dietType
├── allergies[]
├── preferredFoods[]
├── dislikedFoods[]
├── preferredMealCount
├── maxPrepTime
├── budgetLevel
├── countryCode
├── regionCode
└── additionalNotes
```

Esta é apenas a direção arquitetural; não significa que todos os campos devam ser migrados imediatamente para estes modelos exatos.

---

# 33. Não duplicar dados derivados

Evitar armazenar campos que podem ser calculados com segurança.

Exemplos:

## Idade

Não armazenar:

```text
age = 21
```

Armazenar:

```text
birthDate
```

e calcular idade quando necessário.

## Peso inicial

Na primeira entrada:

```text
startWeight = currentWeight
```

Depois não sobrescrever automaticamente o peso inicial a cada atualização.

## Status Premium

Deve continuar sendo resolvido a partir das fontes oficiais de acesso, em vez de criar flags inconsistentes em vários lugares.

---

# 34. Onboarding deve ser versionado

Manter e utilizar:

```text
onboardingVersion
```

Quando o onboarding mudar significativamente, incrementar a versão.

Exemplo:

```text
v1
→ dados atuais

v2
→ adiciona localidade e número de refeições
```

Usuários antigos não devem ser forçados necessariamente a repetir tudo.

Pode existir um fluxo incremental:

```text
Precisamos de duas informações para melhorar seus próximos planos.
```

Pedindo somente os campos ausentes.

---

# 35. Migração de usuários já existentes

Ao adicionar novos campos obrigatórios para novos usuários:

- não quebrar usuários antigos;
- permitir `null` temporariamente quando necessário;
- criar fluxo de atualização progressiva;
- não gerar valores fictícios;
- não assumir localidade;
- não assumir sexo de cálculo;
- não assumir quantidade de refeições.

Exemplo:

```text
preferredMealCount = null
```

até o usuário informar.

---

# 36. Regra de UX: evitar onboarding cansativo

O objetivo não é coletar o máximo de informação possível.

O objetivo é coletar **o mínimo necessário para entregar um primeiro plano bom**.

Preferir:

- 5 etapas curtas;
- botões;
- chips;
- seletores;
- exemplos;
- valores sugeridos;
- feedback de progresso.

Evitar grandes formulários de uma única página.

---

# 37. Decisão sobre o momento da parceria com academias

A arquitetura de academias já está documentada no guia anterior, mas a implementação deve começar somente após:

- conclusão do escopo inicial;
- estabilização do produto;
- correção dos principais débitos técnicos;
- preparação da base administrativa necessária.

Isso evita fazer o produto B2B2C em cima de uma base ainda instável.

---

# 38. Visão consolidada da evolução do SmartPlate

```text
SMARTPLATE V1
│
├── autenticação
├── onboarding
├── perfil
├── planos
├── receitas
├── lista de compras
├── acompanhamento
├── atividades
├── comunidade
├── gamificação
├── integrações
└── assinatura
        │
        ▼
ESTABILIZAÇÃO
│
├── remover mocks
├── corrigir APIs
├── validar schemas
├── segurança
├── autorização
├── tratamento de erros
└── testes
        │
        ▼
FUNDAÇÃO DE ESCALA
│
├── auth abstraction
├── SmartPlate internal user ID
├── base Admin
├── RBAC
└── auditoria
        │
        ▼
PARCEIROS
│
├── academias
├── matrículas
├── códigos
├── memberships
├── painel Partner
├── grupos oficiais
└── benefícios
        │
        ▼
PROFISSIONAIS
│
├── nutricionistas
├── verificação
├── consentimentos
└── acompanhamento
        │
        ▼
OPERAÇÃO EM ESCALA
│
├── Admin completo
├── analytics
├── billing
├── suporte
├── integrações B2B
├── observabilidade
└── automações
```

---

# 39. Checklist antes de iniciar Academias

- [ ] Escopo inicial concluído.
- [ ] Onboarding revisado.
- [ ] Dados reais substituem mocks principais.
- [ ] Meal Plan estável.
- [ ] Receitas estáveis.
- [ ] Lista de compras estável.
- [ ] Perfil estável.
- [ ] Comunidade estável.
- [ ] Gamificação estável.
- [ ] Assinaturas estáveis.
- [ ] Autorização revisada.
- [ ] APIs críticas revisadas.
- [ ] Segurança do checkout revisada.
- [ ] Estratégia de identificação interna definida.
- [ ] Camada `lib/auth` criada ou planejada.
- [ ] Base do Admin definida.
- [ ] Schema preparado para futuras migrations.

---

# 40. Checklist do onboarding revisado

## Identidade

- [ ] Nome de exibição.
- [ ] Username.
- [ ] E-mail vindo da autenticação.
- [ ] Data de nascimento.
- [ ] Sexo de cálculo, somente se a fórmula exigir.

## Corpo

- [ ] Altura.
- [ ] Peso atual.
- [ ] Peso inicial derivado do peso atual.
- [ ] Peso-meta.

## Objetivo

- [ ] Perder peso.
- [ ] Manter peso.
- [ ] Ganhar peso.

## Rotina

- [ ] Nível de atividade.
- [ ] Número preferido de refeições.
- [ ] Nível culinário.
- [ ] Tempo máximo de preparo.

## Alimentação

- [ ] Tipo de alimentação.
- [ ] Alergias/intolerâncias.
- [ ] Alimentos preferidos.
- [ ] Alimentos não desejados.

## Realidade

- [ ] Orçamento.
- [ ] País.
- [ ] Estado/região.
- [ ] Observações livres.

## Não obrigatório

- [ ] Bio fora do onboarding.
- [ ] Avatar fora do onboarding.
- [ ] Telefone não obrigatório.
- [ ] CPF não obrigatório.
- [ ] Endereço não obrigatório.
- [ ] Dados de academia opcionais.
- [ ] Integrações externas opcionais.

---

# 41. Decisões fechadas

As seguintes decisões estão consideradas fechadas até nova revisão explícita:

1. Clerk continua sendo utilizado.
2. Volume de usuários, sozinho, não justifica migração de autenticação.
3. Autorização pertence ao domínio do SmartPlate.
4. Criar abstração interna sobre Clerk.
5. Planejar identificador interno independente do Clerk.
6. Clerk Organizations pode ser útil para staff de academia, não para todos os alunos.
7. Haverá painel Partner e painel Admin global separados.
8. O Admin completo não será prioridade antes da conclusão da v1.
9. Ferramentas administrativas mínimas podem existir antes.
10. O Admin deve crescer por módulos.
11. Permissões administrativas devem evoluir para RBAC granular.
12. Onboarding deve coletar apenas dados necessários ao primeiro resultado.
13. Bio e avatar não precisam estar no onboarding.
14. Peso inicial deve nascer do peso atual.
15. Número de refeições deve ser adicionado.
16. Localidade alimentar deve ser adicionada.
17. Sexo de cálculo só deve ser coletado se houver necessidade da fórmula.
18. Academia parceira deve ser etapa opcional futura.
19. Validação da academia não pode bloquear o cadastro comum.
20. Membership verificado deve ser a base dos benefícios, não um cupom compartilhável.
21. Membership de academia não concede acesso a dados privados do usuário.
22. Mudanças futuras no onboarding devem utilizar versionamento.
23. Usuários existentes devem ser migrados progressivamente, sem dados inventados.

---

# 42. Próxima ação recomendada

Este documento não cria uma nova frente imediata de desenvolvimento.

A ação recomendada continua sendo:

```text
FINALIZAR O ESCOPO INICIAL DO SMARTPLATE
```

Depois:

```text
revisar pendências
→ estabilizar dados
→ revisar onboarding
→ corrigir arquitetura crítica
→ iniciar base Admin
→ iniciar parceiros
```

O arquivo principal de Academias e Parceiros continua sendo a especificação detalhada para essa fase futura.

---

# 43. Documentos relacionados

```text
SMARTPLATE_PARCEIROS_ACADEMIAS_IMPLEMENTACAO.md
```

Documento principal da arquitetura de:

- academias;
- parceiros;
- matrículas;
- códigos;
- painel da academia;
- profissionais;
- benefícios;
- comunidade das academias;
- APIs;
- segurança;
- multi-tenancy;
- integrações.

Este arquivo deve permanecer como **adendo de decisões pós-arquitetura**.

---

**SmartPlate AI — Registro de Decisões Arquiteturais**

Última consolidação: **24 de agosto de 2026**
