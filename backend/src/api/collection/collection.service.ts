import { Injectable, NotFoundException } from '@nestjs/common';
import { CollectionRepository } from '../../repository/collection.repository';
import { AsyncLocalStorageService } from '../../async-local-storage/async-local-storage.service';

export interface CreateCollectionData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

const DEFAULT_COLLECTION_NAME = 'Untitled';

export interface UpdateCollectionData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

@Injectable()
export class CollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly als: AsyncLocalStorageService,
  ) {}

  create(userId: string, data: CreateCollectionData = {}) {
    return this.collectionRepository.create({
      userId,
      name: data.name?.trim() || DEFAULT_COLLECTION_NAME,
      description: data.description,
      icon: data.icon,
      color: data.color,
    });
  }

  async findOne(userId: string, id: string) {
    const row = await this.collectionRepository.findByIdAndUserId(id, userId);

    if (!row) {
      throw new NotFoundException();
    }

    return row;
  }
  async list(userId: string) {
    return this.collectionRepository.findManyByUserId(userId);
  }
  async update(userId: string, id: string, data: UpdateCollectionData) {
    const res = await this.collectionRepository.updateByIdAndUserId({
      id,
      userId,
      data,
    });
    if (res.count === 0) throw new NotFoundException();
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const res = await this.collectionRepository.deleteByIdAndUserId(id, userId);
    if (res.count === 0) throw new NotFoundException();
  }
}
