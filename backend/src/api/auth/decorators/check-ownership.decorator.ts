import { SetMetadata } from '@nestjs/common';

export const CHECK_OWNERSHIP = 'check_ownership';

// Chỉ các model Prisma có cột userId mới ownable.
export type OwnableModel = 'collection' | 'document' | 'conversation';

export interface OwnershipMeta {
  model: OwnableModel;
  idParam: string;
}

export const CheckOwnership = (model: OwnableModel, idParam = 'id') =>
  SetMetadata(CHECK_OWNERSHIP, { model, idParam } satisfies OwnershipMeta);
