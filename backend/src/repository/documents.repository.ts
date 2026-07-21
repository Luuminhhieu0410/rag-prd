import { Injectable } from '@nestjs/common';
import { PostgresService } from '../databases/postgres/postgres.service';
import { IngestSourceType } from '../helpers/documents/source-type';
import { IngestionStatus } from '../../generated/prisma/enums';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PostgresService) {}

  create(data: {
    collectionId: string;
    userId: string;
    sourceType: IngestSourceType;
    originalName: string;
    byteSize: bigint;
    status: IngestionStatus;
  }) {
    return this.prisma.getClient().document.create({
      data,
    });
  }
  getDocById(documentId: string) {
    return this.prisma.getClient().document.findUnique({
      where: { id: documentId },
    });
  }
  findManyByCollectionAndUser(
    collectionId: string,
    userId: string,
    orderByCreatedAt: 'desc' | 'asc' = 'desc',
  ) {
    return this.prisma.getClient().document.findMany({
      where: {
        collectionId,
        userId,
      },
      orderBy: {
        createdAt: orderByCreatedAt,
      },
    });
  }
  countReadyByCollectionAndUser(collectionId: string, userId: string) {
    return this.prisma.getClient().document.count({
      where: { collectionId, userId, status: 'ready' },
    });
  }
  updateByField(documentId: string, data = {}) {
    return this.prisma.getClient().document.update({
      where: { id: documentId },
      data: data,
    });
  }
  findByIdAndUser(documentId: string, collectionId: string, userId: string) {
    return this.prisma.getClient().document.findFirst({
      where: {
        id: documentId,
        collectionId,
        userId,
      },
    });
  }

  findSourceUrl(documentId: string, collectionId: string, userId: string) {
    return this.prisma.getClient().document.findFirst({
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
    return this.prisma.getClient().document.findFirst({
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
    return this.prisma.getClient().document.delete({
      where: {
        id: documentId,
      },
    });
  }
}
