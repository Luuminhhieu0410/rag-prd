import { Module } from '@nestjs/common';
import { IngestionProcessesService } from './ingestion-processes.service';
import { IngestionProcessesController } from './ingestion-processes.controller';
import { AuthModule } from '../auth/auth.module';
import { RepositoryModule } from '../../repository/repository.module';

@Module({
  imports: [AuthModule, RepositoryModule],
  controllers: [IngestionProcessesController],
  providers: [IngestionProcessesService],
})
export class IngestionProcessesModule {}
