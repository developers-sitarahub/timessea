"use client";

import { useEffect, useState, useRef } from "react";
import { Drawer } from "vaul";
import { Send, Heart, MessageCircle, Loader2, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: string;
  name: string;
  picture: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: User;
  likeCount: number;
  likedByMe: boolean;
  replies: Comment[];
  parentId: string | null;
}

interface CommentsDrawerProps {
  articleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentCount: number;
}

export function CommentsDrawer({
  articleId,
  open,
  onOpenChange,
  commentCount: initialCommentCount,
}: CommentsDrawerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, articleId]);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/comments/article/${articleId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    // Optimistic UI update could go here, but for now simple:
    try {
      const res = await fetch("http://localhost:5000/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization headers should be handled by middleware/interceptor or global config
        },
        body: JSON.stringify({
          content: newComment,
          articleId,
          parentId: replyingTo?.id,
        }),
      });

      if (res.ok) {
        setNewComment("");
        setReplyingTo(null);
        fetchComments(); // Refresh to see new comment
      }
    } catch (error) {
      console.error("Failed to post comment", error);
    }
  };

  const handleLike = async (commentId: string) => {
    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            likedByMe: !c.likedByMe,
            likeCount: c.likedByMe ? c.likeCount - 1 : c.likeCount + 1,
          };
        }
        // Check replies
        const updatedReplies = c.replies.map((r) => {
          if (r.id === commentId) {
            return {
              ...r,
              likedByMe: !r.likedByMe,
              likeCount: r.likedByMe ? r.likeCount - 1 : r.likeCount + 1,
            };
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      }),
    );

    try {
      await fetch(`http://localhost:5000/api/comments/${commentId}/like`, {
        method: "POST",
      });
    } catch (error) {
      // Revert on error (omitted for brevity)
      console.error("Failed to toggle like", error);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Overlay className="absolute inset-0 bg-black/40 z-50" />
      <Drawer.Content className="absolute bottom-0 left-0 right-0 max-h-[85vh] h-[70vh] flex flex-col rounded-t-[20px] bg-background z-50 outline-none shadow-2xl border border-border/50">
        {/* Handle */}
        <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mt-3 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
          <div className="w-8" /> {/* Spacer for centering */}
          <Drawer.Title className="font-semibold text-sm">
            Comments
          </Drawer.Title>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 -mr-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <MessageCircle className="h-12 w-12 stroke-1 opacity-50" />
              <p className="text-sm">
                No comments yet. Start the conversation.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="group">
                <div className="flex gap-3 items-start">
                  {comment.author.picture ? (
                    <Image
                      src={comment.author.picture}
                      alt={comment.author.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-bold">
                      {comment.author.name?.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold truncate">
                        {comment.author.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed mt-0.5">
                      {comment.content}
                    </p>

                    <div className="flex items-center gap-4 mt-1.5">
                      <button
                        onClick={() => setReplyingTo(comment)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Reply
                      </button>
                      {comment.likeCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {comment.likeCount} likes
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleLike(comment.id)}
                    className="shrink-0 pt-1"
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        comment.likedByMe
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>
                </div>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="mt-4 pl-11 space-y-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 items-start">
                        {reply.author.picture ? (
                          <Image
                            src={reply.author.picture}
                            alt={reply.author.name}
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted shrink-0 flex items-center justify-center text-[10px] font-bold">
                            {reply.author.name?.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold truncate">
                              {reply.author.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed mt-0.5 text-foreground/90">
                            {reply.content}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <button
                              onClick={() => handleLike(reply.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground group/like"
                            >
                              <Heart
                                className={cn(
                                  "h-3 w-3",
                                  reply.likedByMe
                                    ? "fill-red-500 text-red-500"
                                    : "",
                                )}
                              />
                              {reply.likeCount > 0 && (
                                <span>{reply.likeCount}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-4 border-t border-border bg-background pb-8 sm:pb-4 z-50 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted/40 px-3 py-2 rounded-t-lg text-xs text-muted-foreground mb-2 shadow-sm border border-border/50">
              <span>
                Replying to{" "}
                <span className="font-bold text-foreground">
                  @{replyingTo.author.name}
                </span>
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="hover:text-foreground p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              className="flex-1 bg-muted/50 hover:bg-muted/80 focus:bg-background rounded-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium border border-border focus:border-primary/50"
              onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
            />
            <button
              disabled={!newComment.trim()}
              onClick={handlePostComment}
              className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-sm"
            >
              <Send className="h-4 w-4 ml-0.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
