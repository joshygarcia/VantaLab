import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as admin from 'firebase-admin';
import { FirebaseService, FieldValue } from '../firebase/firebase.service';

// Prisma-shaped Firestore facade. We deliberately mimic the subset of Prisma
// operations used across services so the migration from Postgres to Firestore
// keeps call sites mostly unchanged.

type WhereClause = Record<string, any>;

export type UserRole = 'MEMBER' | 'DEVELOPER';

export interface UserAccount {
  id: string;
  email: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  kieApiKey: string | null;
  canvasState: string | null;
  customSpaceConfig: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowJob {
  id: string;
  userId: string;
  workspaceId: string;
  nodeId: string;
  model: string;
  prompt: string;
  status: string;
  mediaUrl: string | null;
  error: string | null;
  parameters: string | null;
  idempotencyKey: string | null;
  requestFingerprint: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  provider: string;
  key: string;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiUsageLog {
  id: string;
  apiKeyId: string;
  endpoint: string;
  costInCents: number;
  status: number;
  createdAt: Date;
}

export interface UserCreditBalance {
  userId: string;
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  packageId: string;
  credits: number;
  amountInCents: number;
  currency: string;
  stripePaymentIntentId: string;
  metadata: string | null;
  processedAt: Date;
}

function tsToDate(value: any): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function applyWhere<T extends Record<string, any>>(item: T, where: WhereClause | undefined): boolean {
  if (!where) return true;
  for (const [field, condition] of Object.entries(where)) {
    const value = item[field];
    if (condition === null || condition === undefined || typeof condition !== 'object' || condition instanceof Date) {
      if (value !== condition) return false;
      continue;
    }
    if ('not' in condition) {
      if (condition.not === null && value === null) return false;
      if (condition.not !== null && value === condition.not) return false;
    }
    if ('in' in condition && Array.isArray(condition.in)) {
      if (!condition.in.includes(value)) return false;
    }
    if ('gte' in condition && value instanceof Date && condition.gte instanceof Date) {
      if (value.getTime() < condition.gte.getTime()) return false;
    }
    if ('lte' in condition && value instanceof Date && condition.lte instanceof Date) {
      if (value.getTime() > condition.lte.getTime()) return false;
    }
    if ('lt' in condition && value instanceof Date && condition.lt instanceof Date) {
      if (value.getTime() >= condition.lt.getTime()) return false;
    }
    if ('gt' in condition && value instanceof Date && condition.gt instanceof Date) {
      if (value.getTime() <= condition.gt.getTime()) return false;
    }
  }
  return true;
}

type AnyDoc = admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot;

function docToObject<T>(doc: AnyDoc, idField = 'id'): T | null {
  if (!doc.exists) return null;
  const data = doc.data() as any;
  return {
    ...data,
    [idField]: doc.id,
    createdAt: data.createdAt ? tsToDate(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? tsToDate(data.updatedAt) : undefined,
    processedAt: data.processedAt ? tsToDate(data.processedAt) : undefined,
    lastUsedAt: data.lastUsedAt ? tsToDate(data.lastUsedAt) : null,
  } as T;
}

@Injectable()
export class DbService {
  constructor(private readonly firebase: FirebaseService) {}

  private get db() {
    return this.firebase.firestore;
  }

  // ─── userAccount ──────────────────────────────────────────────────────────
  userAccount = {
    findUnique: async (args: { where: { id?: string; email?: string } }): Promise<UserAccount | null> => {
      if (args.where.id) {
        const snap = await this.db.collection('users').doc(args.where.id).get();
        return docToObject<UserAccount>(snap);
      }
      if (args.where.email) {
        const q = await this.db.collection('users').where('email', '==', args.where.email).limit(1).get();
        if (q.empty) return null;
        return docToObject<UserAccount>(q.docs[0]);
      }
      return null;
    },
    create: async (args: { data: Partial<UserAccount> & { id: string } }): Promise<UserAccount> => {
      const now = new Date();
      const payload = {
        email: args.data.email ?? null,
        role: args.data.role ?? 'MEMBER',
        createdAt: now,
        updatedAt: now,
      };
      await this.db.collection('users').doc(args.data.id).set(payload);
      return { id: args.data.id, ...payload } as UserAccount;
    },
    update: async (args: { where: { id: string }; data: Partial<UserAccount> }): Promise<UserAccount> => {
      const ref = this.db.collection('users').doc(args.where.id);
      await ref.update({ ...args.data, updatedAt: new Date() });
      const snap = await ref.get();
      return docToObject<UserAccount>(snap) as UserAccount;
    },
    delete: async (args: { where: { id: string } }): Promise<void> => {
      await this.db.collection('users').doc(args.where.id).delete();
    },
    count: async (): Promise<number> => {
      const snap = await this.db.collection('users').count().get();
      return snap.data().count;
    },
  };

  // ─── workspace ────────────────────────────────────────────────────────────
  workspace = {
    findUnique: async (args: { where: { id: string }; select?: any }): Promise<Workspace | null> => {
      const snap = await this.db.collection('workspaces').doc(args.where.id).get();
      return docToObject<Workspace>(snap);
    },
    findMany: async (args: { where?: WhereClause; select?: any } = {}): Promise<Workspace[]> => {
      let q: admin.firestore.Query = this.db.collection('workspaces');
      if (args.where?.customSpaceConfig?.not === null) {
        q = q.where('customSpaceConfig', '!=', null);
      }
      const snap = await q.get();
      return snap.docs.map((d) => docToObject<Workspace>(d) as Workspace);
    },
    upsert: async (args: {
      where: { id: string };
      create: Partial<Workspace> & { id: string; userId: string; name: string };
      update: Partial<Workspace>;
    }): Promise<Workspace> => {
      const ref = this.db.collection('workspaces').doc(args.where.id);
      const existing = await ref.get();
      const now = new Date();
      if (existing.exists) {
        await ref.update({ ...args.update, updatedAt: now });
      } else {
        await ref.set({
          userId: args.create.userId,
          name: args.create.name,
          kieApiKey: args.create.kieApiKey ?? null,
          canvasState: args.create.canvasState ?? null,
          customSpaceConfig: args.create.customSpaceConfig ?? null,
          createdAt: now,
          updatedAt: now,
          ...args.update,
        });
      }
      const fresh = await ref.get();
      return docToObject<Workspace>(fresh) as Workspace;
    },
    updateMany: async (args: { where: { id: string }; data: Partial<Workspace> }) => {
      const ref = this.db.collection('workspaces').doc(args.where.id);
      const existing = await ref.get();
      if (!existing.exists) return { count: 0 };
      await ref.update({ ...args.data, updatedAt: new Date() });
      return { count: 1 };
    },
  };

  // ─── workflowJob ──────────────────────────────────────────────────────────
  workflowJob = {
    findUnique: async (args: { where: { id?: string; idempotencyKey?: string } }): Promise<WorkflowJob | null> => {
      if (args.where.id) {
        const snap = await this.db.collection('workflowJobs').doc(args.where.id).get();
        return docToObject<WorkflowJob>(snap);
      }
      if (args.where.idempotencyKey) {
        const q = await this.db
          .collection('workflowJobs')
          .where('idempotencyKey', '==', args.where.idempotencyKey)
          .limit(1)
          .get();
        if (q.empty) return null;
        return docToObject<WorkflowJob>(q.docs[0]);
      }
      return null;
    },
    create: async (args: { data: Partial<WorkflowJob> & { id: string; userId: string; workspaceId: string; nodeId: string; model: string; prompt: string; status: string } }): Promise<WorkflowJob> => {
      const now = new Date();
      const payload = {
        userId: args.data.userId,
        workspaceId: args.data.workspaceId,
        nodeId: args.data.nodeId,
        model: args.data.model,
        prompt: args.data.prompt,
        status: args.data.status,
        mediaUrl: args.data.mediaUrl ?? null,
        error: args.data.error ?? null,
        parameters: args.data.parameters ?? null,
        idempotencyKey: args.data.idempotencyKey ?? null,
        requestFingerprint: args.data.requestFingerprint ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.collection('workflowJobs').doc(args.data.id).create(payload);
      return { id: args.data.id, ...payload } as WorkflowJob;
    },
    update: async (args: { where: { id: string }; data: Partial<WorkflowJob> }): Promise<WorkflowJob> => {
      const ref = this.db.collection('workflowJobs').doc(args.where.id);
      await ref.update({ ...args.data, updatedAt: new Date() });
      const snap = await ref.get();
      return docToObject<WorkflowJob>(snap) as WorkflowJob;
    },
    findMany: async (args: {
      where?: WhereClause;
      orderBy?: Record<string, 'asc' | 'desc'>;
      take?: number;
      select?: any;
    } = {}): Promise<WorkflowJob[]> => {
      let q: admin.firestore.Query = this.db.collection('workflowJobs');
      if (args.where?.userId) q = q.where('userId', '==', args.where.userId);
      if (args.where?.workspaceId) q = q.where('workspaceId', '==', args.where.workspaceId);
      if (args.where?.model && typeof args.where.model === 'string') q = q.where('model', '==', args.where.model);
      if (args.where?.status) {
        if (typeof args.where.status === 'string') q = q.where('status', '==', args.where.status);
        else if (args.where.status.in) q = q.where('status', 'in', args.where.status.in);
      }
      if (args.where?.createdAt?.gte) q = q.where('createdAt', '>=', args.where.createdAt.gte);
      if (args.where?.createdAt?.lte) q = q.where('createdAt', '<=', args.where.createdAt.lte);
      if (args.orderBy?.createdAt) q = q.orderBy('createdAt', args.orderBy.createdAt);
      if (args.take) q = q.limit(args.take);
      const snap = await q.get();
      let results = snap.docs.map((d) => docToObject<WorkflowJob>(d) as WorkflowJob);
      // Post-filter for mediaUrl: not null and additional filters that Firestore can't combine.
      if (args.where?.mediaUrl?.not === null) {
        results = results.filter((j) => j.mediaUrl !== null && j.mediaUrl !== undefined);
      }
      return results;
    },
    deleteMany: async (args: { where: WhereClause }): Promise<{ count: number }> => {
      let q: admin.firestore.Query = this.db.collection('workflowJobs');
      if (args.where.userId) q = q.where('userId', '==', args.where.userId);
      if (args.where.createdAt?.lt) q = q.where('createdAt', '<', args.where.createdAt.lt);
      const snap = await q.get();
      if (snap.empty) return { count: 0 };
      const batch = this.db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { count: snap.size };
    },
    groupBy: async (args: { by: string[]; _count: any }): Promise<Array<{ status: string; _count: { id: number } }>> => {
      const snap = await this.db.collection('workflowJobs').get();
      const groups: Record<string, number> = {};
      for (const doc of snap.docs) {
        const status = (doc.data() as any).status ?? 'unknown';
        groups[status] = (groups[status] ?? 0) + 1;
      }
      return Object.entries(groups).map(([status, count]) => ({ status, _count: { id: count } }));
    },
  };

  // ─── apiKey ───────────────────────────────────────────────────────────────
  apiKey = {
    findFirst: async (args: { where?: WhereClause; orderBy?: Record<string, 'asc' | 'desc'> } = {}): Promise<ApiKey | null> => {
      let q: admin.firestore.Query = this.db.collection('apiKeys');
      if (args.where?.isActive !== undefined) q = q.where('isActive', '==', args.where.isActive);
      const snap = await q.get();
      let results = snap.docs.map((d) => docToObject<ApiKey>(d) as ApiKey);
      if (args.orderBy?.lastUsedAt) {
        const direction = args.orderBy.lastUsedAt === 'asc' ? 1 : -1;
        results.sort((a, b) => {
          const at = a.lastUsedAt?.getTime() ?? 0;
          const bt = b.lastUsedAt?.getTime() ?? 0;
          return (at - bt) * direction;
        });
      }
      return results[0] ?? null;
    },
    findMany: async (args: { orderBy?: Record<string, 'asc' | 'desc'> } = {}): Promise<ApiKey[]> => {
      const snap = await this.db.collection('apiKeys').get();
      let results = snap.docs.map((d) => docToObject<ApiKey>(d) as ApiKey);
      if (args.orderBy?.createdAt) {
        const direction = args.orderBy.createdAt === 'asc' ? 1 : -1;
        results.sort((a, b) => (a.createdAt.getTime() - b.createdAt.getTime()) * direction);
      }
      return results;
    },
    create: async (args: { data: Partial<ApiKey> & { key: string } }): Promise<ApiKey> => {
      const id = randomUUID();
      const now = new Date();
      const payload = {
        provider: args.data.provider ?? 'kie.ai',
        key: args.data.key,
        isActive: args.data.isActive ?? true,
        usageCount: args.data.usageCount ?? 0,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.collection('apiKeys').doc(id).set(payload);
      return { id, ...payload } as ApiKey;
    },
    update: async (args: { where: { id: string }; data: Partial<ApiKey> & { usageCount?: any } }): Promise<ApiKey> => {
      const ref = this.db.collection('apiKeys').doc(args.where.id);
      const updates: Record<string, any> = { ...args.data, updatedAt: new Date() };
      if (args.data.usageCount && typeof args.data.usageCount === 'object' && 'increment' in args.data.usageCount) {
        updates.usageCount = FieldValue.increment((args.data.usageCount as any).increment);
      }
      await ref.update(updates);
      const snap = await ref.get();
      return docToObject<ApiKey>(snap) as ApiKey;
    },
    delete: async (args: { where: { id: string } }): Promise<ApiKey> => {
      const ref = this.db.collection('apiKeys').doc(args.where.id);
      const snap = await ref.get();
      const obj = docToObject<ApiKey>(snap) as ApiKey;
      await ref.delete();
      return obj;
    },
    count: async (args: { where?: WhereClause } = {}): Promise<number> => {
      let q: admin.firestore.Query = this.db.collection('apiKeys');
      if (args.where?.isActive !== undefined) q = q.where('isActive', '==', args.where.isActive);
      const snap = await q.count().get();
      return snap.data().count;
    },
  };

  // ─── apiUsageLog ──────────────────────────────────────────────────────────
  apiUsageLog = {
    create: async (args: { data: Omit<ApiUsageLog, 'id' | 'createdAt'> }): Promise<ApiUsageLog> => {
      const id = randomUUID();
      const now = new Date();
      const payload = { ...args.data, createdAt: now };
      await this.db
        .collection('apiKeys')
        .doc(args.data.apiKeyId)
        .collection('usage')
        .doc(id)
        .set(payload);
      return { id, ...payload };
    },
    aggregate: async (_args: { _count: any; _sum: any }): Promise<{ _count: { id: number }; _sum: { costInCents: number } }> => {
      const snap = await this.db.collectionGroup('usage').get();
      let count = 0;
      let costInCents = 0;
      for (const doc of snap.docs) {
        count += 1;
        costInCents += (doc.data() as any).costInCents ?? 0;
      }
      return { _count: { id: count }, _sum: { costInCents } };
    },
  };

  // ─── userCreditBalance ────────────────────────────────────────────────────
  userCreditBalance = {
    findUnique: async (args: { where: { userId: string }; select?: any }): Promise<UserCreditBalance | null> => {
      const snap = await this.db.collection('creditBalances').doc(args.where.userId).get();
      if (!snap.exists) return null;
      const data = snap.data() as any;
      return {
        userId: args.where.userId,
        credits: data.credits ?? 0,
        createdAt: tsToDate(data.createdAt),
        updatedAt: tsToDate(data.updatedAt),
      };
    },
    upsert: async (args: {
      where: { userId: string };
      create: { userId: string; credits: number };
      update: { credits: any };
    }): Promise<UserCreditBalance> => {
      const ref = this.db.collection('creditBalances').doc(args.where.userId);
      const now = new Date();
      const updates: Record<string, any> = { updatedAt: now };
      if (args.update.credits && typeof args.update.credits === 'object') {
        if ('increment' in args.update.credits) updates.credits = FieldValue.increment(args.update.credits.increment);
        else if ('decrement' in args.update.credits) updates.credits = FieldValue.increment(-args.update.credits.decrement);
      } else if (typeof args.update.credits === 'number') {
        updates.credits = args.update.credits;
      }

      await this.db.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists) {
          tx.update(ref, updates);
        } else {
          tx.set(ref, {
            credits: args.create.credits,
            createdAt: now,
            updatedAt: now,
          });
        }
      });

      const snap = await ref.get();
      const data = snap.data() as any;
      return {
        userId: args.where.userId,
        credits: data.credits ?? 0,
        createdAt: tsToDate(data.createdAt),
        updatedAt: tsToDate(data.updatedAt),
      };
    },
    updateMany: async (args: { where: { userId: string; credits?: { gte: number } }; data: { credits: any } }): Promise<{ count: number }> => {
      const ref = this.db.collection('creditBalances').doc(args.where.userId);
      let count = 0;
      await this.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const current = (snap.data() as any).credits ?? 0;
        if (args.where.credits?.gte !== undefined && current < args.where.credits.gte) return;

        let next = current;
        if (args.data.credits && typeof args.data.credits === 'object') {
          if ('decrement' in args.data.credits) next = current - args.data.credits.decrement;
          else if ('increment' in args.data.credits) next = current + args.data.credits.increment;
        }
        tx.update(ref, { credits: next, updatedAt: new Date() });
        count = 1;
      });
      return { count };
    },
  };

  // ─── creditTransaction ────────────────────────────────────────────────────
  creditTransaction = {
    findUnique: async (args: { where: { stripePaymentIntentId: string; userId?: string } }): Promise<CreditTransaction | null> => {
      // userId is required to know the subcollection — fall back to collectionGroup.
      if (args.where.userId) {
        const snap = await this.db
          .collection('creditBalances')
          .doc(args.where.userId)
          .collection('transactions')
          .doc(args.where.stripePaymentIntentId)
          .get();
        if (!snap.exists) return null;
        return { ...(snap.data() as any), id: snap.id, processedAt: tsToDate((snap.data() as any).processedAt) } as CreditTransaction;
      }
      const q = await this.db
        .collectionGroup('transactions')
        .where('stripePaymentIntentId', '==', args.where.stripePaymentIntentId)
        .limit(1)
        .get();
      if (q.empty) return null;
      const doc = q.docs[0];
      return { ...(doc.data() as any), id: doc.id, processedAt: tsToDate((doc.data() as any).processedAt) } as CreditTransaction;
    },
    create: async (args: { data: Omit<CreditTransaction, 'id' | 'processedAt'> }): Promise<CreditTransaction> => {
      const now = new Date();
      const ref = this.db
        .collection('creditBalances')
        .doc(args.data.userId)
        .collection('transactions')
        .doc(args.data.stripePaymentIntentId);
      const payload = { ...args.data, processedAt: now };
      await ref.create(payload);
      return { id: args.data.stripePaymentIntentId, ...payload } as CreditTransaction;
    },
    findMany: async (args: { where: { userId: string }; orderBy?: any; take?: number }): Promise<CreditTransaction[]> => {
      let q: admin.firestore.Query = this.db
        .collection('creditBalances')
        .doc(args.where.userId)
        .collection('transactions');
      if (args.orderBy?.processedAt) q = q.orderBy('processedAt', args.orderBy.processedAt);
      if (args.take) q = q.limit(args.take);
      const snap = await q.get();
      return snap.docs.map((d) => ({
        ...(d.data() as any),
        id: d.id,
        processedAt: tsToDate((d.data() as any).processedAt),
      })) as CreditTransaction[];
    },
    aggregate: async (_args: { _sum: any }): Promise<{ _sum: { credits: number; amountInCents: number } }> => {
      const snap = await this.db.collectionGroup('transactions').get();
      let credits = 0;
      let amountInCents = 0;
      for (const doc of snap.docs) {
        const data = doc.data() as any;
        credits += data.credits ?? 0;
        amountInCents += data.amountInCents ?? 0;
      }
      return { _sum: { credits, amountInCents } };
    },
  };

  // ─── transaction helpers ──────────────────────────────────────────────────
  // Stripe webhook idempotent settlement helper. Atomically creates a
  // CreditTransaction doc (keyed on PaymentIntent ID) and increments the
  // user's balance. Throws ALREADY_EXISTS on replay, which the caller swallows.
  async settleStripePayment(args: {
    userId: string;
    packageId: string;
    credits: number;
    amountInCents: number;
    currency: string;
    stripePaymentIntentId: string;
    metadata: Record<string, unknown>;
  }): Promise<{ alreadyProcessed: boolean }> {
    const balanceRef = this.db.collection('creditBalances').doc(args.userId);
    const txRef = balanceRef.collection('transactions').doc(args.stripePaymentIntentId);

    try {
      await this.db.runTransaction(async (tx) => {
        const existing = await tx.get(txRef);
        if (existing.exists) {
          throw new Error('ALREADY_EXISTS_OK');
        }
        const balanceSnap = await tx.get(balanceRef);
        const now = new Date();
        if (balanceSnap.exists) {
          tx.update(balanceRef, {
            credits: FieldValue.increment(args.credits),
            updatedAt: now,
          });
        } else {
          tx.set(balanceRef, {
            credits: args.credits,
            createdAt: now,
            updatedAt: now,
          });
        }
        tx.set(txRef, {
          userId: args.userId,
          packageId: args.packageId,
          credits: args.credits,
          amountInCents: args.amountInCents,
          currency: args.currency,
          stripePaymentIntentId: args.stripePaymentIntentId,
          metadata: JSON.stringify(args.metadata),
          processedAt: now,
        });
      });
      return { alreadyProcessed: false };
    } catch (err: any) {
      if (err?.message === 'ALREADY_EXISTS_OK') return { alreadyProcessed: true };
      throw err;
    }
  }

  // Atomic credit-spend used at workflow execution time.
  async spendCredits(userId: string, amount: number): Promise<{ success: boolean; remaining: number }> {
    const ref = this.db.collection('creditBalances').doc(userId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? ((snap.data() as any).credits ?? 0) : 0;
      if (current < amount) return { success: false, remaining: current };
      const next = current - amount;
      if (snap.exists) tx.update(ref, { credits: next, updatedAt: new Date() });
      else tx.set(ref, { credits: next, createdAt: new Date(), updatedAt: new Date() });
      return { success: true, remaining: next };
    });
  }
}
