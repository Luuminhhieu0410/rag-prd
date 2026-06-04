import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
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
      });
      this.logger.log('firebase-admin initialized');
    }
  }

  getAuth(): Auth {
    return admin.auth();
  }
}
