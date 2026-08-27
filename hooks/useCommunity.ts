// hooks/useCommunity.ts
// Centraliza toda a comunicação com /api/community/** via React Query,
// seguindo o mesmo padrão de hooks/useMealPlan.ts (queries/mutations +
// react-hot-toast + invalidateQueries). Nenhuma regra de negócio mora aqui —
// tudo é validado/decidido no backend.
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type {
  BlockedUserEntry,
  ChallengeRankingEntry,
  ChallengeSummary,
  CommunityCommentSummary,
  CommunityPostSummary,
  FeedTab,
  FriendEntry,
  GroupMemberEntry,
  GroupSummary,
  HashtagDetail,
  HashtagSuggestion,
  ModerationReportEntry,
  RankingEntry,
  RankingPeriod,
  RankingScope,
  SocialUserSummary,
} from "@/types/community";

async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Erro inesperado");
  return data as T;
}

const keys = {
  me: ["community", "me"] as const,
  // Prefixo — invalidar isto cobre TODAS as abas (chronological/for-you/
  // friends) de um mesmo destino (comunidade geral ou um grupo específico).
  feedGroup: (groupId?: string) => ["community", "feed", groupId ?? "global"] as const,
  feed: (groupId?: string, tab: FeedTab = "chronological") => ["community", "feed", groupId ?? "global", tab] as const,
  comments: (postId: string) => ["community", "comments", postId] as const,
  hashtagSuggestions: (q: string) => ["community", "hashtag-suggestions", q] as const,
  hashtag: (slug: string) => ["community", "hashtag", slug] as const,
  hashtagPosts: (slug: string) => ["community", "hashtag-posts", slug] as const,
  search: (q: string) => ["community", "search", q] as const,
  friends: ["community", "friends"] as const,
  blocks: ["community", "blocks"] as const,
  feedMutes: ["community", "feed-mutes"] as const,
  contentMutes: ["community", "content-mutes"] as const,
  groupInvites: ["community", "group-invites"] as const,
  groups: ["community", "groups"] as const,
  group: (groupId: string) => ["community", "group", groupId] as const,
  groupMembers: (groupId: string) => ["community", "group-members", groupId] as const,
  groupStats: (groupId: string) => ["community", "group-stats", groupId] as const,
  invitePreview: (code: string) => ["community", "invite-preview", code] as const,
  challenges: (scope: "global" | "group", groupId?: string) => ["community", "challenges", scope, groupId ?? null] as const,
  ranking: (period: RankingPeriod, scope: RankingScope, groupId?: string) =>
    ["community", "ranking", period, scope, groupId ?? null] as const,
  challengeRanking: (challengeId: string) => ["community", "challenge-ranking", challengeId] as const,
  gamification: ["community", "gamification"] as const,
  moderationReports: (status: string) => ["community", "moderation-reports", status] as const,
};

// ─── Perfil social ──────────────────────────────────────────────────────────

export function useCommunityMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => apiFetch("/api/community/me"),
    staleTime: 30_000,
  });
}

export function useUpdateCommunityProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      apiFetch("/api/community/me", { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.me });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useAcceptCommunityTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/community/me", { method: "PATCH", body: JSON.stringify({ acceptTerms: true }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.me }),
    onError: (error: Error) => toast.error(error.message),
  });
}

// ─── Feed / posts / reações / comentários ──────────────────────────────────

export function useCommunityFeed(groupId?: string, tab: FeedTab = "chronological") {
  return useInfiniteQuery({
    queryKey: keys.feed(groupId, tab),
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      const params = new URLSearchParams();
      if (groupId) params.set("groupId", groupId);
      // `tab` só é enviado pra comunidade geral — grupo é sempre cronológico
      // (ver app/api/community/feed/route.ts).
      if (!groupId && tab !== "chronological") params.set("tab", tab);
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<{ items: CommunityPostSummary[]; nextCursor: string | null }>(
        `/api/community/feed?${params.toString()}`
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Feed é o conteúdo mais dinâmico do app (outros usuários postam o
    // tempo todo) — staleTime bem menor que o default global de 60s.
    staleTime: 15_000,
  });
}

export function useCreatePost(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type: "TEXT" | "ACHIEVEMENT" | "STREAK" | "CHALLENGE" | "PLAN_SHARE" | "ACTIVITY" | "EXTERNAL_SHARE" | "PROGRESS_SHARE";
      text?: string;
      imageUrl?: string;
      achievementCode?: string;
      streakMilestone?: number;
      shareToken?: string;
      progressPhotoId?: string;
      showWeight?: boolean;
      activityLogId?: string;
      externalShareProvider?: string;
      externalShareUrl?: string;
      externalShareImageUrl?: string;
      groupId?: string;
    }) => apiFetch("/api/community/posts", { method: "POST", body: JSON.stringify({ ...input, groupId: input.groupId ?? groupId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.feedGroup(groupId) });
      toast.success("Publicado na comunidade!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdatePost(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      apiFetch(`/api/community/posts/${postId}`, { method: "PATCH", body: JSON.stringify({ text }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.feedGroup(groupId) });
      toast.success("Post atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeletePost(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiFetch(`/api/community/posts/${postId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.feedGroup(groupId) });
      toast.success("Post removido");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useToggleReaction(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: "LIKE" | "FIRE" | "CLAP" | "STRONG" }) =>
      apiFetch(`/api/community/posts/${postId}/reactions`, { method: "POST", body: JSON.stringify({ type }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.feedGroup(groupId) }),
    onError: (error: Error) => toast.error(error.message),
  });
}

/** "Não tenho interesse" — recomendação, não denúncia/bloqueio (checklist itens 36-40). Só afeta o próprio Feed Para Você. */
export function useMarkNotInterested(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      apiFetch(`/api/community/posts/${postId}/feedback`, { method: "POST", body: JSON.stringify({ type: "NOT_INTERESTED" }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.feedGroup(groupId) });
      toast.success("Você verá menos posts como esse.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useComments(postId: string | null) {
  return useInfiniteQuery({
    queryKey: keys.comments(postId ?? "none"),
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<{ items: CommunityCommentSummary[]; nextCursor: string | null }>(
        `/api/community/posts/${postId}/comments?${params.toString()}`
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!postId,
    staleTime: 15_000,
  });
}

export function useCreateComment(postId: string, groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      apiFetch(`/api/community/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ text }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: keys.feedGroup(groupId) });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteComment(postId: string, groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => apiFetch(`/api/community/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: keys.feedGroup(groupId) });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ─── Hashtags (interesses/descoberta) ───────────────────────────────────────

export function useHashtagSuggestions(query: string) {
  return useQuery({
    queryKey: keys.hashtagSuggestions(query),
    queryFn: () => apiFetch<{ hashtags: HashtagSuggestion[] }>(`/api/community/hashtags/suggest?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 1,
    staleTime: 30_000,
  });
}

export function useHashtag(slug: string | null) {
  return useQuery({
    queryKey: keys.hashtag(slug ?? "none"),
    queryFn: () => apiFetch<{ hashtag: HashtagDetail; isFollowing: boolean }>(`/api/community/hashtags/${slug}`),
    enabled: !!slug,
  });
}

export function useHashtagPosts(slug: string | null) {
  return useInfiniteQuery({
    queryKey: keys.hashtagPosts(slug ?? "none"),
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<{ items: CommunityPostSummary[]; nextCursor: string | null }>(
        `/api/community/hashtags/${slug}/posts?${params.toString()}`
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!slug,
    staleTime: 15_000,
  });
}

export function useFollowHashtag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => apiFetch(`/api/community/hashtags/${slug}/follow`, { method: "POST" }),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: keys.hashtag(slug) });
      // Seguir muda o ranking do Feed Para Você.
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUnfollowHashtag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => apiFetch(`/api/community/hashtags/${slug}/follow`, { method: "DELETE" }),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: keys.hashtag(slug) });
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ─── Busca / amigos / bloqueios ─────────────────────────────────────────────

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: keys.search(query),
    queryFn: () => apiFetch<{ users: SocialUserSummary[] }>(`/api/community/users/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
  });
}

export function useFriends() {
  return useQuery({
    queryKey: keys.friends,
    queryFn: () =>
      apiFetch<{ accepted: FriendEntry[]; incomingPending: FriendEntry[]; outgoingPending: FriendEntry[] }>(
        "/api/community/friends"
      ),
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) =>
      apiFetch("/api/community/friends", { method: "POST", body: JSON.stringify({ targetUserId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.friends });
      toast.success("Solicitação enviada!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ friendshipId, action }: { friendshipId: string; action: "accept" | "decline" }) =>
      apiFetch(`/api/community/friends/${friendshipId}`, { method: "PATCH", body: JSON.stringify({ action }) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.friends });
      // Aceitar amizade muda quem aparece na aba Amigos do feed.
      if (variables.action === "accept") queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
      toast.success(variables.action === "accept" ? "Amizade aceita!" : "Solicitação recusada");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRemoveOrCancelFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) => apiFetch(`/api/community/friends/${friendshipId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.friends }),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: keys.blocks,
    queryFn: () => apiFetch<{ blocks: BlockedUserEntry[] }>("/api/community/blocks"),
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) =>
      apiFetch("/api/community/blocks", { method: "POST", body: JSON.stringify({ targetUserId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.blocks });
      queryClient.invalidateQueries({ queryKey: keys.friends });
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
      queryClient.invalidateQueries({ queryKey: ["community", "search"] });
      toast.success("Usuário bloqueado");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => apiFetch(`/api/community/blocks/${targetUserId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.blocks }),
    onError: (error: Error) => toast.error(error.message),
  });
}

// ─── Mutes de feed (silenciar sem bloquear) ────────────────────────────────

export function useFeedMutes() {
  return useQuery({ queryKey: keys.feedMutes, queryFn: () => apiFetch("/api/community/feed-mutes") });
}

export function useMuteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => apiFetch("/api/community/feed-mutes", { method: "POST", body: JSON.stringify({ targetUserId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.feedMutes });
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
      toast.success("Publicações deste usuário ocultadas do seu feed");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUnmuteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => apiFetch(`/api/community/feed-mutes/${targetUserId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.feedMutes });
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useContentMutes() {
  return useQuery({ queryKey: keys.contentMutes, queryFn: () => apiFetch<{ mutedTypes: string[] }>("/api/community/content-mutes") });
}

export function useMutePostType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postType: string) => apiFetch("/api/community/content-mutes", { method: "POST", body: JSON.stringify({ postType }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.contentMutes });
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUnmutePostType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postType: string) => apiFetch(`/api/community/content-mutes/${postType}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.contentMutes });
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ─── Grupos ─────────────────────────────────────────────────────────────────

export function useMyGroups() {
  return useQuery({
    queryKey: keys.groups,
    queryFn: () => apiFetch<{ groups: GroupSummary[] }>("/api/community/groups"),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      apiFetch("/api/community/groups", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.groups });
      toast.success("Grupo criado!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useGroup(groupId: string | null) {
  return useQuery({
    queryKey: keys.group(groupId ?? "none"),
    queryFn: () => apiFetch(`/api/community/groups/${groupId}`),
    enabled: !!groupId,
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; description?: string }) =>
      apiFetch(`/api/community/groups/${groupId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: keys.groups });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => apiFetch(`/api/community/groups/${groupId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.groups });
      toast.success("Grupo excluído");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: keys.groupMembers(groupId ?? "none"),
    queryFn: () => apiFetch<{ members: GroupMemberEntry[] }>(`/api/community/groups/${groupId}/members`),
    enabled: !!groupId,
  });
}

export function useGroupStats(groupId?: string) {
  return useQuery({
    queryKey: keys.groupStats(groupId ?? "none"),
    queryFn: () =>
      apiFetch<{
        memberCount: number;
        weekStart: string;
        weekEnd: string;
        activeMemberCount: number;
        activityCount: number;
        mealsCompletedCount: number;
      }>(`/api/community/groups/${groupId}/stats`),
    enabled: !!groupId,
  });
}

export function useChangeGroupMemberRole(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "ADMIN" | "MEMBER" }) =>
      apiFetch(`/api/community/groups/${groupId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.groupMembers(groupId) }),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useInviteUserToGroup(groupId: string) {
  return useMutation({
    mutationFn: (targetUserId: string) =>
      apiFetch(`/api/community/groups/${groupId}/invite-user`, { method: "POST", body: JSON.stringify({ targetUserId }) }),
    onSuccess: () => toast.success("Convite enviado"),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useGroupInvites() {
  return useQuery({
    queryKey: keys.groupInvites,
    queryFn: () => apiFetch<{ invites: { id: string; groupId: string; groupName: string; createdAt: string }[] }>("/api/community/group-invites"),
  });
}

export function useRespondGroupInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, action }: { inviteId: string; action: "accept" | "decline" }) =>
      apiFetch(`/api/community/group-invites/${inviteId}`, { method: "PATCH", body: JSON.stringify({ action }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.groupInvites });
      queryClient.invalidateQueries({ queryKey: keys.groups });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/community/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.groupMembers(groupId) });
      queryClient.invalidateQueries({ queryKey: keys.group(groupId) });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, transferToUserId }: { groupId: string; transferToUserId?: string }) =>
      apiFetch(`/api/community/groups/${groupId}/leave`, { method: "POST", body: JSON.stringify({ transferToUserId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.groups });
      toast.success("Você saiu do grupo");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRegenerateInviteCode(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/community/groups/${groupId}/invite`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: keys.groups });
      toast.success("Novo código de convite gerado");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useJoinGroupByCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      apiFetch<{ group: { id: string }; alreadyJoined: boolean }>("/api/community/groups/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.groups });
      toast.success("Você entrou no grupo!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useGroupInvitePreview(code: string | null) {
  return useQuery({
    queryKey: keys.invitePreview(code ?? "none"),
    queryFn: () => apiFetch(`/api/community/groups/invite/${code}`),
    enabled: !!code,
    retry: false,
  });
}

// ─── Desafios ───────────────────────────────────────────────────────────────

export function useChallenges(scope: "global" | "group", groupId?: string) {
  return useQuery({
    queryKey: keys.challenges(scope, groupId),
    queryFn: () => {
      const params = new URLSearchParams({ scope });
      if (groupId) params.set("groupId", groupId);
      return apiFetch<{ challenges: ChallengeSummary[] }>(`/api/community/challenges?${params.toString()}`);
    },
    enabled: scope === "global" || !!groupId,
  });
}

export interface CompletedChallengeEntry {
  challengeId: string;
  title: string;
  description: string | null;
  metric: string;
  target: number;
  scope: "GLOBAL" | "GROUP";
  groupId: string | null;
  progress: number;
  completedAt: string;
}

/** Desafios já concluídos pelo usuário — alimenta o ChallengePickerModal do Composer. */
export function useCompletedChallenges() {
  return useQuery({
    queryKey: ["community", "challenges", "completed"],
    queryFn: () => apiFetch<{ challenges: CompletedChallengeEntry[] }>("/api/community/challenges/completed"),
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      scope: "GLOBAL" | "GROUP";
      groupId?: string;
      title: string;
      description?: string;
      metric: "ACTIVE_DAYS" | "MEAL_COMPLETIONS" | "STREAK_DAYS";
      target: number;
      collectiveTarget?: number;
      rewardXp: number;
      startsAt: string;
      endsAt: string;
    }) => apiFetch("/api/community/challenges", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.challenges(variables.scope === "GLOBAL" ? "global" : "group", variables.groupId) });
      toast.success("Desafio criado!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useJoinChallenge(scope: "global" | "group", groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) => apiFetch(`/api/community/challenges/${challengeId}/join`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.challenges(scope, groupId) });
      toast.success("Você entrou no desafio!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteChallenge(scope: "global" | "group", groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) => apiFetch(`/api/community/challenges/${challengeId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.challenges(scope, groupId) });
      toast.success("Desafio removido");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ─── Ranking / gamificação ──────────────────────────────────────────────────

export function useRanking(period: RankingPeriod, scope: RankingScope, groupId?: string) {
  return useQuery({
    queryKey: keys.ranking(period, scope, groupId),
    queryFn: () => {
      const params = new URLSearchParams({ period, scope });
      if (groupId) params.set("groupId", groupId);
      return apiFetch<{ ranking: RankingEntry[]; viewer: { rank: number; xp: number } | null; viewerUserId: string }>(
        `/api/community/ranking?${params.toString()}`
      );
    },
    enabled: scope !== "group" || !!groupId,
  });
}

export function useChallengeRanking(challengeId: string | null) {
  return useQuery({
    queryKey: keys.challengeRanking(challengeId ?? "none"),
    queryFn: () =>
      apiFetch<{ ranking: ChallengeRankingEntry[]; collective: { progress: number; target: number; participantCount: number } | null }>(
        `/api/community/challenges/${challengeId}/ranking`
      ),
    enabled: !!challengeId,
  });
}

export function useGamificationDetail() {
  return useQuery({
    queryKey: keys.gamification,
    queryFn: () => apiFetch("/api/community/gamification"),
  });
}

// ─── Denúncias / moderação ──────────────────────────────────────────────────

export function useCreateReport() {
  return useMutation({
    mutationFn: (input: { targetType: "POST" | "COMMENT" | "USER"; targetId: string; reason: string; details?: string }) =>
      apiFetch("/api/community/reports", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => toast.success("Denúncia enviada. Nossa equipe vai analisar."),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useModerationReports(status: string = "PENDING") {
  return useQuery({
    queryKey: keys.moderationReports(status),
    queryFn: () => apiFetch<{ reports: ModerationReportEntry[] }>(`/api/community/moderation/reports?status=${status}`),
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: "RESOLVED" | "DISMISSED" }) =>
      apiFetch(`/api/community/moderation/reports/${reportId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", "moderation-reports"] });
      toast.success("Denúncia atualizada");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useHidePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiFetch(`/api/community/moderation/posts/${postId}/hide`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
      toast.success("Post ocultado");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
