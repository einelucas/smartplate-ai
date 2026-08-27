// lib/admin/authz.ts
// Autorização do painel administrativo. Reaproveita ProfileRole (mesmo campo
// já usado pela moderação da Comunidade — ver lib/community/authz.ts) em vez
// de criar um segundo sistema de papéis. Se o produto crescer para o RBAC
// granular descrito em SMARTPLATE_DECISOES_POS_ARQUITETURA_ACADEMIAS.md
// (seção 12: SUPER_ADMIN/SUPPORT/PARTNERS_MANAGER/...), este é o único ponto
// que precisará mudar — nenhuma rota deve checar `role` diretamente.
import { AuthzError, getProfileRole } from "@/lib/community/authz";

export { AuthzError };

export async function requireAdmin(userId: string) {
  const role = await getProfileRole(userId);
  if (role !== "ADMIN") {
    throw new AuthzError("Acesso restrito a administradores", 403);
  }
  return role;
}
