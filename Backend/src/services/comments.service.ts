import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new comment (top-level or reply)
   */
  /**
   * Create a new comment (top-level or reply)
   */
  async create(data: {
    content: string;
    articleId: string;
    authorId: string;
    parentId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          content: data.content,
          article: { connect: { id: data.articleId } },
          author: { connect: { id: data.authorId } },
          parent: data.parentId
            ? { connect: { id: data.parentId } }
            : undefined,
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

      await tx.article.update({
        where: { id: data.articleId },
        data: { commentCount: { increment: 1 } },
      });

      return comment;
    });
  }

  /**
   * Get all comments for an article (tree structure)
   * Returns top-level comments with nested replies
   */
  async findByArticle(articleId: string, userId?: string) {
    // Fetch all comments for the article
    const allComments = await this.prisma.comment.findMany({
      where: { articleId }, // Fetch even deleted ones to maintain tree, frontend checks deletedAt
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
        commentLikes: userId
          ? {
              where: { userId },
              select: { userId: true },
            }
          : undefined,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build tree structure
    const commentMap = new Map<string, any>();
    const rootComments: any[] = [];

    // First pass: create a map of all comments
    for (const comment of allComments) {
      const { commentLikes, ...rest } = comment as any;
      const likedByMe = commentLikes?.length > 0;

      commentMap.set(comment.id, {
        ...rest,
        // Map backend 'likes' to frontend 'likeCount'
        likeCount: rest.likes,
        likedByMe,
        replies: [],
      });
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
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { commentCount: true },
    });
    return article?.commentCount || 0;
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
  async findAllByArticle(articleId: string) {
    // In the future, we can use userId to mark which comments the user has liked
    return this.findByArticle(articleId);
  }

  /**
   * Delete a comment (soft delete)
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

    return this.prisma.$transaction(async (tx) => {
      // Soft delete
      const deletedComment = await tx.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      });

      // Decrement article comment count
      await tx.article.update({
        where: { id: comment.articleId },
        data: { commentCount: { decrement: 1 } },
      });

      return deletedComment;
    });
  }
}
