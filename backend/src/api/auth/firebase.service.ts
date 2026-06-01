import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import { envConfig } from '../../shared/config/env.config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  onModuleInit() {
    if (!admin.apps.length) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS =
        envConfig.GOOGLE_APPLICATION_CREDENTIALS;
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      this.logger.log('firebase-admin initialized');
    }
  }

  getAuth(): Auth {
    return admin.auth();
  }
}
