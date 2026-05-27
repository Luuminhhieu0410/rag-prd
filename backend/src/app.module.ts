import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostgresModule } from './databases/postgres/postgres.module';
import { ElasticsearchModule } from './databases/elasticsearch/elasticsearch.module';
import { UserModule } from './api/user/user.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [PostgresModule, ElasticsearchModule, UserModule, ApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
