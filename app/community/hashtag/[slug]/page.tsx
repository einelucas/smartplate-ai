// app/community/hashtag/[slug]/page.tsx
// Página de descoberta de uma hashtag: contagem de publicações, seguir/
// deixar de seguir (interesse EXPLÍCITO — nunca implícito por só usar a
// hashtag num post) e o feed de posts públicos elegíveis com ela.
// Mobile-first: cabeçalho e feed em coluna única, sem grid de desktop.
"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Hash, Loader2, MessageSquareHeart } from "lucide-react";
import { useCommunityTermsGate } from "@/components/social/CommunityTermsGate";
import { useFollowHashtag, useHashtag, useHashtagPosts, useUnfollowHashtag } from "@/hooks/useCommunity";
import PostCard from "@/components/social/PostCard";

export default function HashtagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, isLoading } = useHashtag(slug);
  const { data: postsData, isLoading: postsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useHashtagPosts(slug);
  const followHashtag = useFollowHashtag();
  const unfollowHashtag = useUnfollowHashtag();
  const { guard, modal } = useCommunityTermsGate();

  const isFollowing = data?.isFollowing ?? false;
  const postCount = data?.hashtag.postCount ?? 0;
  const posts = postsData?.pages.flatMap((page) => page.items) ?? [];

  const toggleFollow = () => {
    if (isFollowing) unfollowHashtag.mutate(slug);
    else followHashtag.mutate(slug);
  };

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <Link href="/community" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> Comunidade
      </Link>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#007BFF]/10 flex items-center justify-center flex-shrink-0">
              <Hash size={22} className="text-[#007BFF]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-800 truncate">#{slug}</h1>
              {isLoading ? (
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-sm text-slate-400">
                  {postCount} {postCount === 1 ? "publicação" : "publicações"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={toggleFollow}
            disabled={followHashtag.isPending || unfollowHashtag.isPending}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-50 ${
              isFollowing ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-[#007BFF] hover:bg-[#0056b3] text-white"
            }`}
          >
            {isFollowing ? "Seguindo" : "Seguir"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {postsLoading && (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!postsLoading && posts.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
            <div className="w-14 h-14 mx-auto bg-[#007BFF]/10 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquareHeart className="text-[#007BFF]" size={24} />
            </div>
            <p className="font-semibold text-slate-700">Nenhuma publicação com #{slug} ainda.</p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} onRequireTerms={guard} />
        ))}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {isFetchingNextPage && <Loader2 size={14} className="animate-spin" />}
            {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
          </button>
        )}
      </div>

      {modal}
    </div>
  );
}
