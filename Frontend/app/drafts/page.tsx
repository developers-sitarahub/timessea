"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  FileText,
  Trash2,
  Edit,
  Send,
  Loader2,
  Calendar,
  Eye,
  MoreVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function DraftsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login?redirect=/drafts");
      return;
    }

    if (user && token) {
      fetchDrafts();
    }
  }, [user, token, isAuthenticated, isLoading]);

  const fetchDrafts = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/articles/drafts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Drafts response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch drafts:", response.status, errorText);
        throw new Error(`Failed to fetch drafts: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched drafts:", data);
      setDrafts(data);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      setDrafts([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;

    setDeletingId(id);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/articles/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete draft");

      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    } catch (error) {
      console.error("Error deleting draft:", error);
      alert("Failed to delete draft. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-40 -mx-5 -mt-4 mb-6 flex items-center justify-between bg-background/95 backdrop-blur-md px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors group"
            aria-label="Go back"
          >
            <ArrowLeft
              className="h-5 w-5 group-hover:-translate-x-1 transition-transform"
              strokeWidth={2}
            />
          </motion.button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
              Draft Articles
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <AnimatePresence mode="wait">
        {drafts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="bg-secondary/50 p-8 rounded-full mb-6">
              <FileText
                className="w-12 h-12 text-muted-foreground/50"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="text-xl font-black text-foreground font-serif tracking-tight">
              No drafts yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-3 leading-relaxed">
              Start writing your story and save it as a draft to continue later.
            </p>
            <Link
              href="/editor"
              className="mt-8 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Create Draft
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 pb-8"
          >
            {drafts.map((draft, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={draft.id}
                className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-4 flex gap-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="h-32 w-32 shrink-0 rounded-2xl bg-secondary overflow-hidden relative">
                  {draft.image ? (
                    <img
                      src={draft.image}
                      alt={draft.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-secondary to-muted">
                      <span className="text-5xl font-black text-foreground/5 font-serif">
                        {draft.title?.charAt(0) || "D"}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                </div>

                {/* Content */}
                <div className="flex flex-col justify-between py-1 pr-2 flex-1 min-w-0">
                  <div>
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground mb-1.5">
                          {draft.category || "General"}
                        </span>
                        <h4 className="font-bold text-foreground text-lg leading-tight line-clamp-2 font-serif group-hover:text-primary transition-colors">
                          {draft.title || "Untitled Draft"}
                        </h4>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-2">
                      {draft.excerpt ||
                        draft.content?.substring(0, 100) ||
                        "No content"}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {draft.createdAt
                          ? formatDate(draft.createdAt)
                          : "Just now"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {draft.readTime || 1} min
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/editor?draft=${draft.id}`}
                        className="text-xs font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-secondary/50"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </Link>
                      <button
                        onClick={() => handleDelete(draft.id)}
                        disabled={deletingId === draft.id}
                        className="text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-red-500/10 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === draft.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button - Create New Draft */}
      {drafts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Link
            href="/editor"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-4 rounded-full shadow-2xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all font-bold text-sm"
          >
            <Edit className="w-5 h-5" />
            <span className="hidden sm:inline">New Draft</span>
          </Link>
        </motion.div>
      )}
    </AppShell>
  );
}
