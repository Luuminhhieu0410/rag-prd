import {
  Controller,
  Delete,
  Get,
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
import { CheckOwnership } from '../auth/decorators/check-ownership.decorator';
import { MAX_DOCUMENT_FILE_SIZE } from './document-upload.constants';

@Controller('api/collection/:collectionId/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @CheckOwnership('collection', 'collectionId')
  @UseGuards(OwnershipGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_FILE_SIZE } }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Param('collectionId')
    collectionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documents.upload(user.id, collectionId, file);
  }

  @Get()
  @CheckOwnership('collection', 'collectionId')
  @UseGuards(OwnershipGuard)
  list(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
  ) {
    return this.documents.list(user.id, collectionId);
  }

  @Get(':docId/raw-url')
  @CheckOwnership('document', 'docId')
  @UseGuards(OwnershipGuard)
  rawUrl(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.getRawUrl(user.id, collectionId, docId);
  }

  @Get(':docId/text-url')
  @CheckOwnership('document', 'docId')
  @UseGuards(OwnershipGuard)
  textUrl(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.getTextUrl(user.id, collectionId, docId);
  }

  @Get(':docId/content')
  @CheckOwnership('document', 'docId')
  @UseGuards(OwnershipGuard)
  content(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.getContent(user.id, collectionId, docId);
  }

  @Delete(':docId')
  @CheckOwnership('document', 'docId')
  @UseGuards(OwnershipGuard)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    await this.documents.remove(user.id, collectionId, docId);
  }
}
