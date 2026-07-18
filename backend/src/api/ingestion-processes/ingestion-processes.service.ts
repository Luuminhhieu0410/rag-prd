import { Injectable } from '@nestjs/common';
import { IngestionProcessRepository } from '../../repository/ingestion-process.repository';

@Injectable()
export class IngestionProcessesService {
  constructor(
    private readonly ingestionProcessRepository: IngestionProcessRepository,
  ) {}

  getAllJobByCollectionId(collectionId: string) {
    return this.ingestionProcessRepository.getAllJobByCollectionId(
      collectionId,
    );
  }
}
