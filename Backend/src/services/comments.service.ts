import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new comment (top-level or reply)
   */
  async create(data: {
    content: string;
    articleId: string;
    authorId: string;
    parentId?: string;
  }) {
    return this.prisma.comment.create({
      data: {
        content: data.content,
        article: { connect: { id: data.articleId } },
        author: { connect: { id: data.authorId } },
        parent: data.parentId ? { connect: { id: data.parentId } } : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
      },
    });
  }

  /**
   * Get all comments for an article (tree structure)
   * Returns top-level comments with nested replies
   */
  async findByArticle(articleId: string, userId?: string) {
    // Fetch all comments for the article
    const allComments = await this.prisma.comment.findMany({
      where: { articleId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch user likes if userId provided
    const userLikes = userId
      ? await this.prisma.commentLike.findMany({
          where: {
            userId,
            commentId: { in: allComments.map((c) => c.id) },
          },
          select: { commentId: true },
        })
      : [];

    const likedCommentIds = new Set(userLikes.map((l) => l.commentId));

    // Build tree structure
    const commentMap = new Map<string, any>();
    const rootComments: any[] = [];

    // First pass: create a map of all comments
    for (const comment of allComments) {
      const liked = likedCommentIds.has(comment.id);
      commentMap.set(comment.id, { ...comment, replies: [], liked });
    }

    // Second pass: build tree
    for (const comment of allComments) {
      const node = commentMap.get(comment.id);
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId).replies.push(node);
      } else {
        rootComments.push(node);
      }
    }

    return rootComments;
  }

  /**
   * Get comment count for an article
   */
  async getCount(articleId: string): Promise<number> {
    return this.prisma.comment.count({
      where: { articleId },
    });
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string) {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        likes: { increment: 1 },
      },
    });
  }

  /**
   * Toggle like on a comment
   */
  async toggleLike(userId: string, commentId: string) {
    const existing = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existing) {
      return this.prisma.$transaction(async (tx) => {
        await tx.commentLike.delete({
          where: { id: existing.id },
        });
        return tx.comment.update({
          where: { id: commentId },
          data: { likes: { decrement: 1 } },
        });
      });
    } else {
      return this.prisma.$transaction(async (tx) => {
        await tx.commentLike.create({
          data: { userId, commentId },
        });
        return tx.comment.update({
          where: { id: commentId },
          data: { likes: { increment: 1 } },
        });
      });
    }
  }

  /**
   * Alias for findByArticle (for transition)
   */
  async findAllByArticle(articleId: string, userId?: string) {
    return this.findByArticle(articleId, userId);
  }

  /**
   * Delete a comment (and cascading replies)
   */
  async delete(commentId: string, userId: string) {
    // Only author can delete
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new Error('Not authorized to delete this comment');
    }

    return this.prisma.comment.delete({
      where: { id: commentId },
    });
  }
}
