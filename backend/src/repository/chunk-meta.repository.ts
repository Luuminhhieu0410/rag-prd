import { Injectable } from '@nestjs/common';
import { PostgresService } from '../databases/postgres/postgres.service';
import { ChunkMetaCreateManyInput } from '../../generated/prisma/models/ChunkMeta';

@Injectable()
export class ChunkMetaRepository {
  constructor(private readonly prisma: PostgresService) {}

  createMany(data: ChunkMetaCreateManyInput[]) {
    return this.prisma.getClient().chunkMeta.createMany({
      data,
    });
  }

  findIdsByDocumentId(documentId: string) {
    return this.prisma.getClient().chunkMeta.findMany({
      where: { documentId },
      select: { id: true },
    });
  }

  deleteManyByDocumentId(documentId: string) {
    return this.prisma.getClient().chunkMeta.deleteMany({
      where: { documentId },
    });
  }
}
