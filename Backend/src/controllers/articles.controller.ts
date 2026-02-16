import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ArticlesService } from '../services/articles.service';
import { CreateArticleDto } from '../modules/articles/dto/create-article.dto';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../generated/prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
}

@Controller('api/articles')
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  async create(@Body() dto: CreateArticleDto) {
    return this.articlesService.createFromDto(dto);
  }

  @Get('scheduled')
  async getScheduled() {
    return this.articlesService.findScheduled();
  }

  @Get('drafts')
  @UseGuards(AuthGuard('jwt'))
  async getDrafts(@Req() req: Request & { user: { id: string } }) {
    return this.articlesService.findDrafts(req.user.id);
  }

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('hasMedia') hasMedia?: string,
    @Req() req?: Request,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const hasMediaBool = hasMedia === 'true';

    let userId: string | undefined;
    const authHeader = req?.headers?.authorization;
    // console.log('Auth Header:', authHeader); // Debug log

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = this.jwtService.verify<JwtPayload>(token);
        userId = decoded.sub;
      } catch {
        // Ignore invalid token, treat as anonymous
      }
    }

    return this.articlesService.findAll(
      limitNum,
      offsetNum,
      hasMediaBool,
      userId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Prisma.ArticleUpdateInput) {
    return this.articlesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard('jwt'))
  async toggleLike(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return await this.articlesService.toggleLike(id, req.user.id);
  }

  @Post(':id/bookmark')
  async toggleBookmark(@Param('id') id: string) {
    return await this.articlesService.toggleBookmark(id);
  }

  @Post(':id/view')
  async incrementViews(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id: string } },
  ) {
    const viewerId = req.user?.id || req.ip || 'anonymous';
    return await this.articlesService.incrementViews(id, viewerId);
  }

  @Post(':id/read')
  async incrementReads(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id: string } },
  ) {
    const readerId = req.user?.id || req.ip || 'anonymous';
    return await this.articlesService.incrementReads(id, readerId);
  }
}
