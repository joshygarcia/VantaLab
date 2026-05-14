import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private _app?: admin.app.App;

  onModuleInit() {
    if (admin.apps.length > 0) {
      this._app = admin.app();
      return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const useEmulators = process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST;

    if (useEmulators) {
      this.logger.log(`Initializing Firebase Admin against emulators (project=${projectId})`);
      this._app = admin.initializeApp({ projectId, storageBucket });
      return;
    }

    const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    let serviceAccount: any;
    if (credJson) {
      serviceAccount = JSON.parse(credJson);
    } else if (credPath) {
      const absPath = resolve(credPath);
      serviceAccount = JSON.parse(readFileSync(absPath, 'utf8'));
    } else {
      throw new Error(
        'Firebase admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.'
      );
    }

    this._app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId ?? serviceAccount.project_id,
      storageBucket,
    });

    this.logger.log(`Firebase Admin initialized for project ${projectId ?? serviceAccount.project_id}`);
  }

  get app(): admin.app.App {
    if (!this._app) {
      throw new Error('FirebaseService used before onModuleInit ran');
    }
    return this._app;
  }

  get firestore(): admin.firestore.Firestore {
    return this.app.firestore();
  }

  get auth(): admin.auth.Auth {
    return this.app.auth();
  }

  get bucket() {
    return this.app.storage().bucket();
  }
}

export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
