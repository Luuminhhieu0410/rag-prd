import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CollectionService } from './collection.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from './filevalidationpipe';
import { OwnershipGuard } from '../auth/ownership.guard';

@Controller('')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}
  @Post('/uploads')
  @UseGuards(OwnershipGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadFileAndValidate(
    @UploadedFile(
      new FileValidationPipe(),
      // other pipes can be added here
    )
    file: Express.Multer.File,
  ) {
    console.log(file);
    return file;
  }

  @Get('/')
  get() {
    return 'hehe';
  }
}
