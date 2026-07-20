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

  createManyIdempotent(data: ChunkMetaCreateManyInput[]) {
    return this.prisma.getClient().chunkMeta.createMany({
      data,
      skipDuplicates: true,
    });
  }

  findIdsByDocumentId(documentId: string) {
    return this.prisma.getClient().chunkMeta.findMany({
      where: { documentId },
      select: { id: true },
    });
  }

  findByDocumentId(documentId: string) {
    return this.prisma.getClient().chunkMeta.findMany({
      where: { documentId },
      select: { id: true, chunkIndex: true, page: true },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  deleteManyByDocumentId(documentId: string) {
    return this.prisma.getClient().chunkMeta.deleteMany({
      where: { documentId },
    });
  }

  deleteRange(
    documentId: string,
    startInclusive: number,
    endExclusive: number,
  ) {
    return this.prisma.getClient().chunkMeta.deleteMany({
      where: {
        documentId,
        chunkIndex: { gte: startInclusive, lt: endExclusive },
      },
    });
  }
}
