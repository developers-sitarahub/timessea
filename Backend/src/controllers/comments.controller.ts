import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from '../services/comments.service';
import { CreateCommentDto } from '../modules/comments/dto/create-comment.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
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
