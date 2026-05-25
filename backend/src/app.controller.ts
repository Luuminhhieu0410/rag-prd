import {Controller, Get, Injectable} from '@nestjs/common';
import { AppService } from './app.service';
import {PostgresService} from "./postgres/postgres.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly postgresService: PostgresService) {}

  @Get()
  async getHello(): Promise<string> {
      await this.postgresService.$connect();
    return this.appService.getHello();
  }
}
