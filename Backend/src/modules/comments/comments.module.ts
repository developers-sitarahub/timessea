import { Module } from '@nestjs/common';
import { CommentsService } from '../../services/comments.service';
import { CommentsController } from '../../controllers/comments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [PrismaModule, AuthModule, AnalyticsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
