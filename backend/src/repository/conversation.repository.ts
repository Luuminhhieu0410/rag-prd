import { Injectable } from '@nestjs/common';
import { PostgresService } from '../databases/postgres/postgres.service';

@Injectable()
export class ConversationRepository {
  constructor(private readonly postgres: PostgresService) {}

  findByCollectionAndUser(collectionId: string, userId: string) {
    return this.postgres.getClient().conversation.findFirst({
      where: { collectionId, userId },
      select: { id: true },
    });
  }

  getOrCreate(collectionId: string, userId: string) {
    return this.postgres.getClient().conversation.upsert({
      where: { collectionId },
      create: { collectionId, userId },
      update: {},
      select: { id: true },
    });
  }
}
