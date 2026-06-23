import { PostgresService } from '../databases/postgres/postgres.service';
import { Injectable } from '@nestjs/common';
import { CollectionUpdateInput } from '../../generated/prisma/models/Collection';

const COUNT_INCLUDE = {
  _count: { select: { documents: true, conversations: true } },
} as const;
export interface CreateCollectionRecord {
  userId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

@Injectable()
export class CollectionRepository {
  constructor(private readonly prisma: PostgresService) {}

  create(record: CreateCollectionRecord) {
    return this.prisma.getClient().collection.create({
      data: {
        userId: record.userId,
        name: record.name,
        description: record.description,
        icon: record.icon,
        color: record.color,
      },
      include: COUNT_INCLUDE,
    });
  }

  findManyByUserId(userId: string) {
    return this.prisma.getClient().collection.findMany({
      where: { userId },
      include: COUNT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findByIdAndUserId(id: string, userId: string) {
    return this.prisma.getClient().collection.findFirst({
      where: { id, userId },
      include: COUNT_INCLUDE,
    });
  }

  updateByIdAndUserId({
    id,
    userId,
    data,
  }: {
    id: string;
    userId: string;
    data: CollectionUpdateInput;
  }) {
    return this.prisma.getClient().collection.updateMany({
      where: { id, userId },
      data,
    });
  }

  deleteByIdAndUserId(id: string, userId: string) {
    return this.prisma.getClient().collection.deleteMany({
      where: { id, userId },
    });
  }
}
