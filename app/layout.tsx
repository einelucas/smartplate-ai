import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PublicNavBar from "../components/PublicNavBar";
import AppSidebar from "../components/AppSidebar";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";
import { ReactQueryClientProvider } from "../components/react-query-client-provider";
import CreateProfileOnSignIn from "@/components/create-profile";
import PendingInviteRedirect from "@/components/PendingInviteRedirect";
import { PostComposerProvider } from "@/components/social/PostComposerProvider";
import { AchievementUnlockProvider } from "@/components/achievements/AchievementUnlockProvider";
import AchievementUnlockWatcher from "@/components/achievements/AchievementUnlockWatcher";
import { Toaster } from "react-hot-toast"; // 🔥 1. IMPORTE AQUI

export const metadata: Metadata = {
  title: "AI Meal Plans | Simple SaaS Demo",
  description: "Generate personalized meal plans with OpenAI",
};

// viewportFit: "cover" é obrigatório para env(safe-area-inset-*) funcionar
// de verdade em iPhones com notch/indicador Home (ver MobileBottomNav).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <ReactQueryClientProvider>
          <ClerkProvider>
            <CreateProfileOnSignIn />
            <PendingInviteRedirect />

            {/* 🔥 2. COLOQUE O TOASTER AQUI - ANTES DO MAIN */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
              }}
            />

            <SignedOut>
              <PublicNavBar />
              <main className="max-w-7xl mx-auto pt-16 p-4 min-h-screen">
                {children}
              </main>
            </SignedOut>
            <SignedIn>
              <AchievementUnlockProvider>
                <AchievementUnlockWatcher />
                <PostComposerProvider>
                  <AppSidebar>{children}</AppSidebar>
                </PostComposerProvider>
              </AchievementUnlockProvider>
            </SignedIn>
          </ClerkProvider>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
