import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CommentsService } from '../services/comments.service';
import { Comment } from '../generated/prisma/client';
import { CreateCommentDto } from '../modules/comments/dto/create-comment.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
}

@Controller('api/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: RequestWithUser,
  ): Promise<Comment> {
    if (!createCommentDto.content || !createCommentDto.content.trim()) {
      throw new HttpException(
        'Comment content is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.commentsService.create({
      content: createCommentDto.content.trim(),
      articleId: createCommentDto.articleId,
      authorId: req.user.id,
      parentId: createCommentDto.parentId,
    });
  }

  @Post(':id/like')
  @UseGuards(AuthGuard('jwt'))
  async toggleLike(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.commentsService.toggleLike(req.user.id, id);
  }

  @Get('article/:articleId/count')
  async getCount(@Param('articleId') articleId: string) {
    const count = await this.commentsService.getCount(articleId);
    return { count };
  }

  @Get('article/:articleId')
  async findAll(@Param('articleId') articleId: string, @Req() req?: Request & { user?: { id: string } }) {
    const userId = req?.user?.id;
    return this.commentsService.findByArticle(articleId, userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteComment(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<Comment> {
    try {
      return await this.commentsService.delete(id, req.user.id);
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to delete comment',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
