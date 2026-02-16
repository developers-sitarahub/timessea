import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersService } from './users.service';
import { Article, Prisma } from '../generated/prisma/client';
import { CreateArticleDto } from '../modules/articles/dto/create-article.dto';

import { RedisService } from './redis.service';
import { ArticlesGateway } from '../gateways/articles.gateway';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventType } from '../modules/analytics/analytics.interface';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AnalyticsQueryService } from '../services/analytics-query.service';

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private articlesGateway: ArticlesGateway,
    private redisService: RedisService,
    private analyticsService: AnalyticsService,
    private analyticsQueryService: AnalyticsQueryService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleScheduledPosts() {
    const now = new Date();

    // Check for articles scheduled in the past that are not published
    const dueArticles = await this.prisma.article.findMany({
      where: {
        published: false,
        scheduledAt: {
          lte: now,
          not: null,
        },
      },
      select: { id: true, title: true },
    });

    if (dueArticles.length > 0) {
      console.log(
        `[Cron] Publishing ${dueArticles.length} scheduled articles:`,
        dueArticles.map((a) => a.title),
      );

      const updateResult = await this.prisma.article.updateMany({
        where: {
          id: { in: dueArticles.map((a) => a.id) },
        },
        data: {
          published: true,
          scheduledAt: null,
        },
      });
      console.log(
        `[Cron] Successfully published ${updateResult.count} articles.`,
      );
    }
  }

  async createFromDto(dto: CreateArticleDto): Promise<Article> {
    // Find or create author
    let author = await this.usersService.findOne({ email: dto.author?.email });

    if (!author) {
      // Create new user if doesn't exist
      author = await this.usersService.create({
        email: dto.author?.email || 'anonymous@example.com',
        name: dto.author?.name || 'Anonymous',
        picture: dto.author?.picture,
      });
    }

    // Create article with authorId
    return this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        image: dto.image,
        media: dto.media as Prisma.InputJsonValue,
        category: dto.category,
        location: dto.location,
        readTime: dto.readTime,
        authorId: author.id,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        published: dto.published !== undefined ? dto.published : true,
        imageDescription: dto.imageDescription,
        imageCaption: dto.imageCaption,
        imageCredit: dto.imageCredit,
        subheadline: dto.subheadline,
        type: dto.type,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        factChecked: dto.factChecked,
      },
      include: { author: true },
    });
  }

  create(data: Prisma.ArticleCreateInput): Promise<Article> {
    return this.prisma.article.create({ data });
  }

  async findAll(
    limit = 20,
    offset = 0,
    hasMedia = false,
    userId?: string,
  ): Promise<any[]> {
    const start = Date.now();
    const where: Prisma.ArticleWhereInput = {
      published: true,
    };

    if (hasMedia) {
      where.OR = [{ image: { not: null } }, { media: { not: Prisma.DbNull } }];
    }

    console.log('ArticlesService: findAll version 12:30');
    const articles = await this.prisma.article.findMany({
      where,
      take: limit,
      skip: offset,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
        likedBy: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`findAll took ${Date.now() - start}ms for ${limit} items`);

    return articles.map((article) => {
      const { likedBy, ...rest } = article as any;
      return {
        ...rest,
        liked: likedBy?.length > 0,
      };
    });
  }

  async findScheduled(): Promise<Article[]> {
    return this.prisma.article.findMany({
      where: {
        published: false,
        scheduledAt: {
          not: null,
        },
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
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findDrafts(authorId?: string): Promise<Article[]> {
    const where: Prisma.ArticleWhereInput = {
      published: false,
      scheduledAt: null,
    };

    if (authorId) {
      where.authorId = authorId;
    }

    return this.prisma.article.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(
    id: string,
    userId?: string,
  ): Promise<(Article & { liked: boolean }) | null> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
        articleLikes: userId
          ? {
              where: { userId },
              select: { userId: true },
            }
          : false,
      },
    });

    if (!article) return null;

    return {
      ...article,
      liked: userId ? (article as any).articleLikes?.length > 0 : false,
    };
  }

  async findRelated(id: string, limit = 4, offset = 0): Promise<Article[]> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { location: true, category: true },
    });

    if (!article) return [];

    const loc = article.location;
    const cat = article.category;
    let results: Article[] = [];

    // --- Phase 1: Location ---
    let count1 = 0;
    if (loc) {
      count1 = await this.prisma.article.count({
        where: { location: loc, id: { not: id }, published: true },
      });

      if (offset < count1) {
        const take = Math.min(limit, count1 - offset);
        const res = await this.prisma.article.findMany({
          where: { location: loc, id: { not: id }, published: true },
          include: { author: { select: { id: true, name: true, email: true, picture: true } } },
          take,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        });
        results.push(...res);
      }
    }

    // --- Phase 2: Category (Disjoint from Location) ---
    // Condition: match category AND (location != loc OR loc is null)
    // Actually, simply: where category == cat AND location != loc
    // If loc is null, we just match category.
    
    // Check if we need to fetch from Phase 2
    if (results.length < limit) {
      const where2: Prisma.ArticleWhereInput = {
        category: cat,
        id: { not: id },
        published: true,
      };
      if (loc) {
        where2.location = { not: loc };
      }

      const count2 = await this.prisma.article.count({ where: where2 });
      
      // Effective offset for Phase 2:
      // If we are strictly inside Phase 1 (offset < count1), we haven't skipped any Phase 2 items yet?
      // No, if offset < count1, we are reading Phase 1. Phase 2 starts at index `count1`.
      // So relative offset for Phase 2 is 0.
      // If offset >= count1, we skipped `offset - count1` items of Phase 2.
      const effectiveOffset = Math.max(0, offset - count1);

      if (effectiveOffset < count2) {
         const take = Math.min(limit - results.length, count2 - effectiveOffset);
         const res = await this.prisma.article.findMany({
            where: where2,
            include: { author: { select: { id: true, name: true, email: true, picture: true } } },
            take,
            skip: effectiveOffset,
            orderBy: { createdAt: 'desc' },
         });
         results.push(...res);
      }
      
      // Store count2 for Phase 3 calculation?
      // We need cumulative count.
      // Total skipped so far = offset.
      // We consumed Phase 1 (count1).
      // We consumed Phase 2 (count2).
      // Phase 3 starts at count1 + count2.
    }

    // --- Phase 3: Trending / Recent (Disjoint from Loc & Cat) ---
    // Condition: loc != loc AND cat != cat (if they exist)
    if (results.length < limit) {
       // Recalculate counts if needed?
       // We need count2 to determine Phase 3 skip.
       // Let's just recalculate count2 cleanly to be safe.
       const where2: Prisma.ArticleWhereInput = {
        category: cat,
        id: { not: id },
        published: true,
      };
      if (loc) where2.location = { not: loc };
      const count2 = await this.prisma.article.count({ where: where2 });

      const where3: Prisma.ArticleWhereInput = {
        id: { not: id },
        published: true,
      };
      if (loc) where3.location = { not: loc };
      if (cat) where3.category = { not: cat };

      // Effective offset for Phase 3
      const effectiveOffset = Math.max(0, offset - count1 - count2);
      
      const take = limit - results.length;
      
      const res = await this.prisma.article.findMany({
        where: where3,
        include: { author: { select: { id: true, name: true, email: true, picture: true } } },
        take,
        skip: effectiveOffset,
        orderBy: [
           { views: 'desc' },
           { createdAt: 'desc' }
        ],
      });
      results.push(...res);
    }

    return results;
  }

  async findTrending(limit = 4, offset = 0, excludeId?: string): Promise<Article[]> {
    try {
      // 1. Try fetching from ClickHouse
      // Fetch more to handle offset + exclusion
      const fetchLimit = limit + offset + (excludeId ? 1 : 0);
      const trendingData = await this.analyticsQueryService.getTrendingPosts(fetchLimit);
      
      if (trendingData && trendingData.length > 0) {
        let trendingIds = trendingData.map(t => t.post_id);
        
        // Filter excludeId from IDs immediately
        if (excludeId) {
          trendingIds = trendingIds.filter(id => id !== excludeId);
        }

        // Slice for pagination BEFORE querying Prisma to save DB load?
        // No, we need to query Prisma to know if they exist/are published.
        // But querying all might be heavy. Let's query matching IDs.
        
        // We need to fetch all candidates to preserve order
        const articles = await this.prisma.article.findMany({
          where: { 
            id: { in: trendingIds },
            published: true,
          },
          include: { author: { select: { id: true, name: true, email: true, picture: true } } },
        });

        // Re-order based on trendingIds (Prisma doesn't guarantee order)
        const orderedArticles = trendingIds
          .map(id => articles.find(a => a.id === id))
          .filter(a => !!a) as Article[]; // Filter out not found / unpublished

        // Slice
        if (orderedArticles.length > offset) {
            return orderedArticles.slice(offset, offset + limit);
        }
        
        // If we ran out of ClickHouse data (e.g. only 2 trending posts), fall back to Prisma?
        // Or return what we have? User says "atleast and atmost 10".
        // Use fall back if empty results from CH logic.
        if (orderedArticles.length === 0 && offset === 0) {
             throw new Error("No trending data"); // Trigger fallback
        }
        return orderedArticles.slice(offset, offset + limit);
      }
    } catch (err) {
      console.warn("ClickHouse trending fetch failed or empty, falling back to Prisma", err);
    }

    // Fallback: Prisma Order By
    return this.prisma.article.findMany({
      where: { 
        published: true,
        ...(excludeId ? { id: { not: excludeId } } : {})
      },
      include: { author: { select: { id: true, name: true, email: true, picture: true } } },
      orderBy: [
        { views: 'desc' },
        { likes: 'desc' },
      ],
      take: limit,
      skip: offset,
    });
  }

  update(id: string, data: Prisma.ArticleUpdateInput): Promise<Article> {
    return this.prisma.article.update({ where: { id }, data });
  }

  remove(id: string): Promise<Article> {
    return this.prisma.article.delete({ where: { id } });
  }

  async toggleLike(id: string, userId: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new Error('Article not found');
    }

    const existingLike = await this.prisma.articleLike.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId: id,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.$transaction([
        this.prisma.articleLike.delete({
          where: {
            userId_articleId: {
              userId,
              articleId: id,
            },
          },
        }),
        this.prisma.article.update({
          where: { id },
          data: {
            likes: { decrement: 1 },
          },
        }),
      ]);
    } else {
      // Like
      await this.prisma.$transaction([
        this.prisma.articleLike.create({
          data: {
            userId,
            articleId: id,
          },
        }),
        this.prisma.article.update({
          where: { id },
          data: {
            likes: { increment: 1 },
          },
        }),
      ]);
    }

    return this.prisma.article.findUnique({
      where: { id },
      include: { author: true },
    }) as Promise<Article>;
  }

  async toggleBookmark(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new Error('Article not found');
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        bookmarked: !article.bookmarked,
      },
      include: { author: true },
    });
  }

  async incrementViews(id: string, userId: string): Promise<Article> {
    const viewKey = `viewed:${id}:${userId}`;
    const hasViewed = await this.redisService.incrementCounter(viewKey, 3600); // 1 hour TTL

    // If counter > 1, user has already viewed recently
    if (hasViewed > 1) {
      return this.findOne(id) as Promise<Article>;
    }

    const updatedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        views: {
          increment: 1,
        },
      },
      include: { author: true },
    });

    this.articlesGateway.notifyArticleViewed(
      updatedArticle.id,
      updatedArticle.views,
    );

    // Track view event in ClickHouse
    this.analyticsService
      .track({
        event: AnalyticsEventType.POST_VIEW,
        post_id: id,
        user_id: userId,
        metadata: {
          source: 'app',
        },
      })
      .catch((err) => console.error('Failed to track view:', err));

    return updatedArticle;
  }

  async incrementReads(id: string, userId: string): Promise<Article> {
    const readKey = `read:${id}:${userId}`;
    const hasRead = await this.redisService.incrementCounter(readKey, 3600); // 1 hour TTL

    if (hasRead > 1) {
      return this.findOne(id) as Promise<Article>;
    }

    const updatedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        reads: {
          increment: 1,
        },
      },
      include: { author: true },
    });

    // Track read event in ClickHouse
    this.analyticsService
      .track({
        event: AnalyticsEventType.POST_READ,
        post_id: id,
        user_id: userId,
        metadata: {
          source: 'app',
        },
      })
      .catch((err) => console.error('Failed to track read:', err));

    return updatedArticle;
  }
}
