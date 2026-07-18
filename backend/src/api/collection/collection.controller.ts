import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CollectionService,
  CreateCollectionData,
  UpdateCollectionData,
} from './collection.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckOwnership } from '../auth/decorators/check-ownership.decorator';
import { OwnershipGuard } from '../auth/ownership.guard';
import { runWithDelayIfFast } from '../../helpers/utils/delay';

interface CreateCollectionBody {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

type UpdateCollectionBody = CreateCollectionBody;

@Controller('api/collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body?: CreateCollectionBody,
  ) {
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
    return runWithDelayIfFast({
      callback: () => this.collectionService.list(user.id),
      delayTime: 1000,
    });
  }

  @Get(':id')
  @CheckOwnership('collection')
  @UseGuards(OwnershipGuard)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collectionService.findOne(user.id, id);
  }

  @Patch(':id')
  @CheckOwnership('collection')
  @UseGuards(OwnershipGuard)
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
  @CheckOwnership('collection')
  @UseGuards(OwnershipGuard)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.collectionService.remove(user.id, id);
  }
}
