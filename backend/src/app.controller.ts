import { Controller, Get } from '@nestjs/common';
import { Public } from './api/auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getHello() {
    return { status: 'ok' };
  }
}
