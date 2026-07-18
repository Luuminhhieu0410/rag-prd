import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IngestionProcessesService } from './ingestion-processes.service';
import { CheckOwnership } from '../auth/decorators/check-ownership.decorator';
import { OwnershipGuard } from '../auth/ownership.guard';

@Controller('api/ingestion-processes')
export class IngestionProcessesController {
  constructor(
    private readonly ingestionProcessesService: IngestionProcessesService,
  ) {}
  @Get('/:collectionId')
  @CheckOwnership('collection', 'collectionId')
  @UseGuards(OwnershipGuard)
  getIngestionProcesses(
    @Param('collectionId')
    collectionId: string,
  ) {
    return this.ingestionProcessesService.getAllJobByCollectionId(collectionId);
  }
}
