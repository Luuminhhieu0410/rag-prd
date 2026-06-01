import { Controller, Get } from '@nestjs/common';
import { Public } from './api/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor() {}

  @Public()
  @Get()
  getHello() {
    return { status: 'ok' };
  }
}
