import { Module } from '@nestjs/common';
import { CommentsService } from '../../services/comments.service';
import { CommentsController } from '../../controllers/comments.controller';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
