import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../../databases/postgres/postgres.service';

export interface CreateCollectionData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

const DEFAULT_COLLECTION_NAME = 'Untitled';

export interface UpdateCollectionData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

const COUNT_INCLUDE = {
  _count: { select: { documents: true, conversations: true } },
} as const;

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PostgresService) {}

  create(userId: string, data: CreateCollectionData = {}) {
    const name = data.name?.trim() || DEFAULT_COLLECTION_NAME;
    return this.prisma.collection.create({
      data: {
        userId,
        name,
        description: data.description,
        icon: data.icon,
        color: data.color,
      },
      include: COUNT_INCLUDE,
    });
  }

  list(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      include: COUNT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const row = await this.prisma.collection.findFirst({
      where: { id, userId },
      include: COUNT_INCLUDE,
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  async update(userId: string, id: string, data: UpdateCollectionData) {
    const res = await this.prisma.collection.updateMany({
      where: { id, userId },
      data,
    });
    if (res.count === 0) throw new NotFoundException();
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const res = await this.prisma.collection.deleteMany({
      where: { id, userId },
    });
    if (res.count === 0) throw new NotFoundException();
  }
}
