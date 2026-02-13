import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CommentsService } from '../services/comments.service';
import { Comment } from '../generated/prisma/client';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
}
import { CreateCommentDto } from '../modules/comments/dto/create-comment.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createComment(
    @Param('articleId') articleId: string,
    @Body() body: { content: string; parentId?: string },
    @Req() req: RequestWithUser,
  ): Promise<Comment> {
    if (!body.content || !body.content.trim()) {
      throw new HttpException(
        'Comment content is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.commentsService.create({
      content: body.content.trim(),
      articleId,
      authorId: req.user.id,
      parentId: body.parentId,
    });
  }

  /**
   * POST /api/articles/:articleId/comments/:commentId/like
   * Like a comment
   */
  @Post(':articleId/comments/:commentId/like')
  async likeComment(@Param('commentId') commentId: string): Promise<Comment> {
    return this.commentsService.likeComment(commentId);
  }

  /**
   * DELETE /api/articles/:articleId/comments/:commentId
   * Delete a comment (requires auth, owner only)
   */
  @Delete(':articleId/comments/:commentId')
  @UseGuards(AuthGuard('jwt'))
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: RequestWithUser,
  ): Promise<Comment> {
    try {
      return await this.commentsService.delete(commentId, req.user.id);
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to delete comment',
        HttpStatus.FORBIDDEN,
      );
    }
  create(@Body() createCommentDto: CreateCommentDto, @Req() req: Request) {
    const userId = (req as any).user?.id;
    return this.commentsService.create(userId, createCommentDto);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard('jwt'))
  toggleLike(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.id;
    return this.commentsService.toggleLike(userId, id);
  }

  @Get('article/:articleId')
  findAll(@Param('articleId') articleId: string, @Req() req: Request) {
    const userId = (req as any).user?.id; // May be undefined if not authenticated, but we need to ensure optional auth middleware is used if we want this
    return this.commentsService.findAllByArticle(articleId, userId);
  }
}
