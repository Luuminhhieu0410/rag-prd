import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CollectionService,
  CreateCollectionData,
  UpdateCollectionData,
} from './collection.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

interface CreateCollectionBody {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

type UpdateCollectionBody = CreateCollectionBody;

@Controller('')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body?: CreateCollectionBody) {
    // Tạo trống, mặc định name = "Untitled"; user edit sau.
    const data: CreateCollectionData = {
      name: body?.name,
      description: body?.description,
      icon: body?.icon,
      color: body?.color,
    };
    return this.collectionService.create(user.id, data);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.collectionService.list(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collectionService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateCollectionBody,
  ) {
    const data: UpdateCollectionData = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException('name must not be empty');
      data.name = name;
    }
    if (body.description !== undefined) data.description = body.description;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.color !== undefined) data.color = body.color;
    return this.collectionService.update(user.id, id, data);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.collectionService.remove(user.id, id);
  }
}
