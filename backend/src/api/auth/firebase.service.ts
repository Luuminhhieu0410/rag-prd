import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length) return;

    const projectId = this.required('FIREBASE_PROJECT_ID');
    const clientEmail = this.required('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.required('FIREBASE_PRIVATE_KEY').replace(
      /\\n/g,
      '\n',
    );

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    this.logger.log('firebase-admin initialized');
  }

  getAuth(): Auth {
    return admin.auth();
  }

  private required(key: string): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new Error(`Missing required Firebase configuration: ${key}`);
    }
    return value;
  }
}
