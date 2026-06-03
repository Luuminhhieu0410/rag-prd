import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import { envConfig } from '../../shared/config/env.config';
import * as serviceAccount from '../../../serviceAccount.development.json';
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          clientEmail: serviceAccount.client_email,
          projectId: serviceAccount.project_id,
          privateKey: serviceAccount.private_key,
        }),
        storageBucket: envConfig.FIREBASE_STORAGE_BUCKET || undefined,
      });
      this.logger.log('firebase-admin initialized');
    }
  }

  getAuth(): Auth {
    return admin.auth();
  }

  /** Default Storage bucket (name from FIREBASE_STORAGE_BUCKET env). */
  getBucket() {
    return envConfig.FIREBASE_STORAGE_BUCKET
      ? admin.storage().bucket(envConfig.FIREBASE_STORAGE_BUCKET)
      : admin.storage().bucket();
  }
}
