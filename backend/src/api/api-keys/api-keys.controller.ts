import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

interface CreateApiKeyBody {
  name?: string;
  collectionId?: string;
}

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateApiKeyBody) {
    const name = body?.name?.trim();
    if (!name) throw new BadRequestException('name is required');
    return this.apiKeys.create(user.id, name, body.collectionId);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.apiKeys.list(user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.apiKeys.revoke(user.id, id);
  }
}
