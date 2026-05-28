import { BadRequestException, Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  @Get()
  getHello() {
    throw new BadRequestException({ message: 'hehe' });
  }
}
