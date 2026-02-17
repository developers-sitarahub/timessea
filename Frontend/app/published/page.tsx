"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, 
  FileText, 
  ChevronRight, 
  Heart, 
  Eye, 
  MessageCircle,
  BarChart3,
  Loader2,
  ChevronLeft
} from "lucide-react";
import { Skeleton } from "@/components/skeleton";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  subheadline: string;
  image: string;
  category: string;
  createdAt: string;
  likes: number;
  views: number;
  commentCount: number;
  author: {
    name: string;
    picture: string | null;
  };
}

export default function PublishedArticlesPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && token) {
      fetch(`${API_URL}/api/articles/user/published`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          setArticles(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching published articles:", err);
          setLoading(false);
        });
    }
  }, [user, token, authLoading, router]);

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="pb-24">
          <header className="mb-8 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
          </header>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 p-4 rounded-3xl bg-card border border-border/50">
                <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pb-24">
        <header className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-full bg-secondary p-2 text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
              Published Articles
            </h1>
            <p className="text-sm text-muted-foreground">{articles.length} posts live</p>
          </div>
        </header>

        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-secondary p-6">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No published articles</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              You haven't published any articles yet. Draft your first story to see it here.
            </p>
            <Link
              href="/editor"
              className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Create New Post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article, idx) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  href={`/analytics/post/${article.id}`}
                  className="group flex gap-4 p-4 rounded-3xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all relative overflow-hidden"
                >
                  <div className="h-24 w-24 shrink-0 rounded-2xl bg-secondary overflow-hidden relative shadow-inner">
                    {article.image ? (
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-black text-muted-foreground/10 font-serif">
                        {article.title.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {article.category}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold leading-tight text-foreground line-clamp-2 font-serif group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1 font-medium">
                        {article.excerpt || article.subheadline}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          <span>{article.views}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                          <Heart className="h-3 w-3" />
                          <span>{article.likes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          <span>{article.commentCount}</span>
                        </div>
                      </div>
                      <div className="rounded-full bg-secondary p-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <BarChart3 className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
