import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('api/collection/:collectionId/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documents.upload(user.id, collectionId, file);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
  ) {
    return this.documents.list(user.id, collectionId);
  }

  @Get(':docId/raw-url')
  rawUrl(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.getRawUrl(user.id, collectionId, docId);
  }

  @Get(':docId/text-url')
  textUrl(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.getTextUrl(user.id, collectionId, docId);
  }

  @Delete(':docId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    await this.documents.remove(user.id, collectionId, docId);
  }
}
