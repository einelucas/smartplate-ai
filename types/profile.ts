// types/profile.ts

export interface PhysicalData {
  height?: number; // centímetros (ex.: 175)
  startWeight?: number; // kg
  targetWeight?: number; // kg
  currentWeight?: number; // kg
  dietType?: string;
  cookingLevel?: string;
  birthDate?: string | null; // privado — nunca exposto pela Comunidade
  activityLevel?: string | null; // privado — nunca exposto pela Comunidade
  onboardingCompletedAt?: string | null;
  onboardingVersion?: number;
}

export interface UserPreferences {
  allergies: string[];
  dislikedFoods: string[];
  preferredFoods: string[];
  maxPrepTime?: number | null;
  budgetLevel?: "low" | "medium" | "high";
  dietGoal?: "perder peso" | "ganhar massa" | "manter";
  additionalNotes?: string | null;
}

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  subscriptionTier?: string | null;
  subscriptionActive: boolean;
  stripeSubscriptionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Identidade pública (SocialProfile) — fonte oficial de nome/@/avatar/bio
// dentro do SmartPlate. Nunca inclui e-mail, peso, altura ou assinatura.
export interface SocialProfileSummary {
  userId: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string;
  isDiscoverable: boolean;
  showStreak: boolean;
  showXp: boolean;
  showAchievements: boolean;
  termsAcceptedAt: string | null;
}

export interface GamificationSummary {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  achievementsCount?: number;
  achievements?: {
    code: string;
    unlockedAt: string;
    title: string;
    description: string;
    emoji: string;
  }[];
}
