import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateCommentDto } from '../modules/comments/dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createCommentDto: CreateCommentDto) {
    if (createCommentDto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parentId },
      });
      if (!parent) {
        throw new Error('Parent comment not found');
      }
      if (parent.articleId !== createCommentDto.articleId) {
        throw new Error('Parent comment belongs to a different article');
      }
    }

    return this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        articleId: createCommentDto.articleId,
        authorId: userId,
        parentId: createCommentDto.parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            picture: true,
          },
        },
      },
    });
  }

  async findAllByArticle(articleId: string, userId?: string) {
    const comments = await this.prisma.comment.findMany({
      where: {
        articleId,
        parentId: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            picture: true,
          },
        },
        commentLikes: true,
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                picture: true,
              },
            },
            commentLikes: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return comments.map((comment) => ({
      ...comment,
      replies: comment.replies.map((reply) => ({
        ...reply,
        likeCount: reply.commentLikes.length,
        likedByMe: userId
          ? reply.commentLikes.some((like) => like.userId === userId)
          : false,
      })),
      likeCount: comment.commentLikes.length,
      likedByMe: userId
        ? comment.commentLikes.some((like) => like.userId === userId)
        : false,
    }));
  }

  async toggleLike(userId: string, commentId: string) {
    // Check if user already liked
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.commentLike.delete({
        where: {
          id: existingLike.id,
        },
      });

      await this.prisma.comment.update({
        where: { id: commentId },
        data: { likes: { decrement: 1 } },
      });

      return { liked: false };
    } else {
      await this.prisma.commentLike.create({
        data: {
          userId,
          commentId,
        },
      });

      await this.prisma.comment.update({
        where: { id: commentId },
        data: { likes: { increment: 1 } },
      });

      return { liked: true };
    }
  }
}
