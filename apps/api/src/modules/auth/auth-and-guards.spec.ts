import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { JWT_SECRET } from './auth.constants';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from './guards/workspace-access.guard';
import { WorkflowQueueService } from '../workflows/workflow-queue.service';
import { WorkflowsController } from '../workflows/workflows.controller';
import { WorkflowsService } from '../workflows/workflows.service';
import { PrismaService } from '../database/prisma.service';

describe('Auth API', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const prismaMock = {
      userAccount: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: { id: string; email?: string | null } }) => ({
          id: data.id,
          email: data.email ?? null,
          role: 'MEMBER'
        })),
        update: jest.fn(async () => ({})),
        delete: jest.fn(async () => ({}))
      }
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        {
          provide: PrismaService,
          useValue: prismaMock
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for /api/v1/auth/me without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('returns claims for /api/v1/auth/me with valid token', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'user-1',
        workspaceIds: ['local', 'ws-2']
      },
      { secret: JWT_SECRET }
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.sub).toBe('user-1');
    expect(response.body.workspaceIds).toEqual(['local', 'ws-2']);
  });

  it('does not persist local dev-user claims and resolves /api/v1/auth/me as developer', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'dev-user',
        workspaceIds: ['local']
      },
      { secret: JWT_SECRET }
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.sub).toBe('dev-user');
    expect(response.body.workspaceIds).toEqual(['local']);
    expect(response.body.role).toBe('developer');
  });

  it('reuses a stable dev user id for /api/v1/auth/dev-token when userId is omitted', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({
        workspaceIds: ['local']
      })
      .expect(200);

    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-token')
      .send({
        workspaceIds: ['local']
      })
      .expect(200);

    const firstClaims = await jwtService.verifyAsync<{ sub: string; workspaceIds: string[] }>(
      first.body.accessToken,
      { secret: JWT_SECRET }
    );
    const secondClaims = await jwtService.verifyAsync<{ sub: string; workspaceIds: string[] }>(
      second.body.accessToken,
      { secret: JWT_SECRET }
    );

    expect(firstClaims.sub).toBe('dev-user');
    expect(secondClaims.sub).toBe('dev-user');
    expect(firstClaims.workspaceIds).toEqual(['local']);
    expect(secondClaims.workspaceIds).toEqual(['local']);
  });
});

describe('Workflow Guards', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const execute = jest.fn(async () => ({
    status: 'processing',
    jobId: 'job_test',
    message: 'queued'
  }));

  beforeAll(async () => {
    const prismaMock = {
      userAccount: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: { id: string; email?: string | null } }) => ({
          id: data.id,
          email: data.email ?? null,
          role: 'MEMBER'
        })),
        update: jest.fn(async () => ({})),
        delete: jest.fn(async () => ({}))
      }
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [WorkflowsController],
      providers: [
        JwtAuthGuard,
        WorkspaceAccessGuard,
        {
          provide: WorkflowsService,
          useValue: {
            execute,
            getJob: jest.fn(async () => ({ id: 'job_test', workspaceId: 'local', status: 'processing' }))
          }
        },
        {
          provide: WorkflowQueueService,
          useValue: {
            jobUpdates: jest.fn()
          }
        },
        {
          provide: PrismaService,
          useValue: prismaMock
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get(JwtService);
    await app.init();
  });

  afterEach(() => {
    execute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when workflow execute has no bearer token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/workflows/execute')
      .send({
        workspaceId: 'local',
        nodeId: 'node-1',
        model: 'veo-3.1',
        parameters: { prompt: 'hello' }
      })
      .expect(401);
  });

  it('returns 403 when token workspace scope does not include payload workspace', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'user-2',
        workspaceIds: ['other-workspace']
      },
      { secret: JWT_SECRET }
    );

    await request(app.getHttpServer())
      .post('/api/v1/workflows/execute')
      .set('authorization', `Bearer ${token}`)
      .send({
        workspaceId: 'local',
        nodeId: 'node-1',
        model: 'veo-3.1',
        parameters: { prompt: 'hello' }
      })
      .expect(403);
  });

  it('returns 202 when token workspace scope allows the request', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'user-3',
        workspaceIds: ['local']
      },
      { secret: JWT_SECRET }
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/workflows/execute')
      .set('authorization', `Bearer ${token}`)
      .send({
        workspaceId: 'local',
        nodeId: 'node-1',
        model: 'veo-3.1',
        parameters: { prompt: 'hello' }
      })
      .expect(202);

    expect(response.body.jobId).toBe('job_test');
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
