import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../auth/ownership.guard';

@Controller('api/collection/:collectionId/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @UseGuards(OwnershipGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @Param('collectionId')
    collectionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documents.upload(user.id, collectionId, file);
  }

  @Get()
  @UseGuards(OwnershipGuard)
  list(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
  ) {
    return this.documents.list(user.id, collectionId);
  }

  @Get(':docId/raw-url')
  @UseGuards(OwnershipGuard)
  rawUrl(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.getRawUrl(user.id, collectionId, docId);
  }

  @Get(':docId/text-url')
  @UseGuards(OwnershipGuard)
  textUrl(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.getTextUrl(user.id, collectionId, docId);
  }

  @Delete(':docId')
  @UseGuards(OwnershipGuard)
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    await this.documents.remove(user.id, collectionId, docId);
  }
}
