// types/community.ts
// Tipos compartilhados do frontend da Comunidade (shape das respostas de
// /api/community/**). Mantém os componentes sociais livres de `any`.

export interface SocialUserSummary {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export interface FriendEntry extends Partial<SocialUserSummary> {
  friendshipId: string;
  userId: string;
  displayName: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  role: "OWNER" | "ADMIN" | "MEMBER";
  inviteCode: string;
  createdAt: string;
}

export interface GroupMemberEntry extends Partial<SocialUserSummary> {
  userId: string;
  displayName: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
}

export interface RankingEntry {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
}

export type RankingPeriod = "weekly" | "monthly" | "all";
export type RankingScope = "global" | "friends" | "group";

export interface ChallengeRankingEntry {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  progress: number;
  target: number;
  percentage: number;
  completedAt: string | null;
}

export interface ModerationReportPreview {
  text?: string;
  type?: string;
  username?: string;
}

export type CommunityPostType = "TEXT" | "ACHIEVEMENT" | "STREAK" | "CHALLENGE" | "PLAN_SHARE" | "ACTIVITY" | "EXTERNAL_SHARE";

export interface CommunityPostSummary {
  id: string;
  type: CommunityPostType;
  text: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  groupId: string | null;
  author: { userId?: string; username: string | null; displayName: string; avatarUrl: string | null };
  isMine: boolean;
  reactionCounts: Record<string, number>;
  myReactions: string[];
  commentCount: number;
}

export interface CommunityCommentSummary {
  id: string;
  text: string;
  createdAt: string;
  author: { userId?: string; displayName: string; avatarUrl?: string | null };
  isMine: boolean;
}

export interface BlockedUserEntry extends Partial<SocialUserSummary> {
  id: string;
  userId: string;
}

export interface ChallengeSummary {
  id: string;
  title: string;
  description: string | null;
  metric: string;
  target: number;
  rewardXp: number;
  startsAt: string;
  endsAt: string;
  scope: "GLOBAL" | "GROUP";
  groupId: string | null;
  joined: boolean;
  myProgress: number | null;
  myCompletedAt: string | null;
}

export interface ModerationReportEntry {
  id: string;
  targetType: "POST" | "COMMENT" | "USER";
  targetId: string;
  reason: string;
  details: string | null;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  preview: ModerationReportPreview | null;
  reporter: { username: string | null; displayName: string } | null;
}
