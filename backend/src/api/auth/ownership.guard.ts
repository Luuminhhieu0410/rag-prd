import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PostgresService } from '../../databases/postgres/postgres.service';
import {
  CHECK_OWNERSHIP,
  OwnershipMeta,
} from './decorators/check-ownership.decorator';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PostgresService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.get<OwnershipMeta | undefined>(
      CHECK_OWNERSHIP,
      context.getHandler(),
    );
    if (!meta) return true; // route không khai báo ownership → bỏ qua

    const req = context.switchToHttp().getRequest();
    const id = req.params[meta.idParam];

    // Prisma không expose delegate động qua type; ép kiểu có kiểm soát.
    const delegate = (this.prisma as unknown as Record<
      string,
      { findUnique: (args: unknown) => Promise<{ userId: string } | null> }
    >)[meta.model];

    const row = await delegate.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!row) throw new NotFoundException();
    if (row.userId !== req.user.id) throw new ForbiddenException();
    return true;
  }
}
