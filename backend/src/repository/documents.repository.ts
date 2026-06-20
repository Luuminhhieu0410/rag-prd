import { Injectable } from '@nestjs/common';
import { PostgresService } from '../databases/postgres/postgres.service';
import { IngestSourceType } from '../api/documents/source-type';
import { DocumentStatus } from '../../generated/prisma/enums';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PostgresService) {}

  create(data: {
    collectionId: string;
    userId: string;
    sourceType: IngestSourceType;
    originalName: string;
    byteSize: bigint;
    status: DocumentStatus;
  }) {
    return this.prisma.document.create({
      data,
    });
  }

  updateSourceUrl(documentId: string, sourceUrl: string) {
    return this.prisma.document.update({
      where: { id: documentId },
      data: { sourceUrl },
    });
  }

  findManyByCollectionAndUser(
    collectionId: string,
    userId: string,
    orderByCreatedAt: 'desc' | 'asc' = 'desc',
  ) {
    return this.prisma.document.findMany({
      where: {
        collectionId,
        userId,
      },
      orderBy: {
        createdAt: orderByCreatedAt,
      },
    });
  }

  findByIdAndUser(documentId: string, collectionId: string, userId: string) {
    return this.prisma.document.findFirst({
      where: {
        id: documentId,
        collectionId,
        userId,
      },
    });
  }

  findSourceUrl(documentId: string, collectionId: string, userId: string) {
    return this.prisma.document.findFirst({
      where: {
        id: documentId,
        collectionId,
        userId,
      },
      select: {
        sourceUrl: true,
      },
    });
  }

  findTextPath(documentId: string, collectionId: string, userId: string) {
    return this.prisma.document.findFirst({
      where: {
        id: documentId,
        collectionId,
        userId,
      },
      select: {
        textPath: true,
      },
    });
  }

  delete(documentId: string) {
    return this.prisma.document.delete({
      where: {
        id: documentId,
      },
    });
  }

  findChunkIds(documentId: string) {
    return this.prisma.chunkMeta.findMany({
      where: {
        documentId,
      },
      select: {
        id: true,
      },
    });
  }
}
