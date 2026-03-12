import { UnauthorizedException } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  const createService = () => {
    const prisma = {
      workspace: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      }
    };

    return {
      prisma,
      service: new WorkspacesService(prisma as any)
    };
  };

  it('returns the owner workspace library when reading from a custom space canvas', async () => {
    const { service } = createService();

    jest.spyOn(service as any, 'readLibraryStore').mockResolvedValue({
      'workspace-1': [
        {
          id: 'hero',
          name: 'Hero',
          description: 'Main character',
          imageUrls: ['https://example.com/1.png', 'https://example.com/2.png']
        }
      ]
    });
    jest.spyOn(service as any, 'readCustomSpacesStore').mockResolvedValue({
      'workspace-1': [
        {
          id: 'space-1',
          ownerWorkspaceId: 'workspace-1',
          name: 'Storyboard Space',
          description: 'Custom space',
          protection: 'standard',
          sharedWorkspaceIds: [],
          createdAt: '2026-03-09T00:00:00.000Z'
        }
      ]
    });
    jest.spyOn(service as any, 'toDisplayableStorageUrl').mockImplementation(async (...args: unknown[]) => args[0]);

    await expect(service.getKlingElementsLibrary('space-1', ['workspace-1'], 'user-1')).resolves.toEqual({
      items: [
        {
          id: 'hero',
          name: 'Hero',
          description: 'Main character',
          imageUrls: ['https://example.com/1.png', 'https://example.com/2.png']
        }
      ]
    });
  });

  it('still rejects access when the requester cannot access the workspace or space', async () => {
    const { service } = createService();

    jest.spyOn(service as any, 'readCustomSpacesStore').mockResolvedValue({
      'workspace-1': [
        {
          id: 'space-1',
          ownerWorkspaceId: 'workspace-1',
          name: 'Storyboard Space',
          description: 'Custom space',
          protection: 'standard',
          sharedWorkspaceIds: [],
          createdAt: '2026-03-09T00:00:00.000Z'
        }
      ]
    });

    await expect(service.getKlingElementsLibrary('space-1', ['workspace-2'], 'user-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('loads a saved canvas for a custom space when metadata exists in the database', async () => {
    const { prisma, service } = createService();

    jest.spyOn(service as any, 'readCustomSpacesStore').mockResolvedValue({});
    prisma.workspace.findUnique
      .mockResolvedValueOnce({
        id: 'space-1',
        name: 'Storyboard Space',
        customSpaceConfig: JSON.stringify({
          ownerWorkspaceId: 'workspace-1',
          protection: 'standard',
          sharedWorkspaceIds: [],
          createdAt: '2026-03-09T00:00:00.000Z',
          description: 'Custom space'
        })
      })
      .mockResolvedValueOnce({
        canvasState: JSON.stringify({
          nodes: [{ id: 'node-1' }],
          edges: []
        })
      });

    await expect(service.getWorkspaceCanvas('space-1', ['workspace-1'])).resolves.toEqual({
      nodes: [{ id: 'node-1' }],
      edges: [],
      viewport: undefined
    });
  });

  it('creates a custom space even when the legacy custom spaces store is not writable', async () => {
    const { prisma, service } = createService();

    prisma.workspace.upsert.mockResolvedValue({
      id: 'storyboard-space-1234abcd'
    });

    jest.spyOn(service as any, 'writeCustomSpacesStore').mockRejectedValue(
      Object.assign(new Error('permission denied'), { code: 'EACCES' })
    );

    await expect(
      service.createCustomSpace(
        'workspace-1',
        {
          name: 'Storyboard Space',
          description: 'Custom space',
          protection: 'standard'
        },
        ['workspace-1'],
        'user-1'
      )
    ).resolves.toEqual({
      item: expect.objectContaining({
        ownerWorkspaceId: 'workspace-1',
        name: 'Storyboard Space',
        description: 'Custom space',
        protection: 'standard',
        sharedWorkspaceIds: []
      })
    });

    expect(prisma.workspace.upsert).toHaveBeenCalledTimes(1);
  });

  it('updates a custom space even when the legacy custom spaces store is not writable', async () => {
    const { prisma, service } = createService();

    prisma.workspace.updateMany.mockResolvedValue({ count: 1 });

    jest.spyOn(service as any, 'readAllCustomSpaces').mockResolvedValue({
      'workspace-1': [
        {
          id: 'space-1',
          ownerWorkspaceId: 'workspace-1',
          name: 'Storyboard Space',
          description: 'Custom space',
          protection: 'standard',
          sharedWorkspaceIds: [],
          createdAt: '2026-03-09T00:00:00.000Z'
        }
      ]
    });
    jest.spyOn(service as any, 'writeCustomSpacesStore').mockRejectedValue(
      Object.assign(new Error('permission denied'), { code: 'EACCES' })
    );

    await expect(
      service.updateCustomSpace(
        'workspace-1',
        'space-1',
        {
          name: 'Updated Storyboard Space',
          description: 'Updated custom space'
        },
        ['workspace-1']
      )
    ).resolves.toEqual({
      item: expect.objectContaining({
        id: 'space-1',
        name: 'Updated Storyboard Space',
        description: 'Updated custom space'
      })
    });

    expect(prisma.workspace.updateMany).toHaveBeenCalledTimes(1);
  });

  it('deletes a custom space even when the legacy custom spaces store is not writable', async () => {
    const { prisma, service } = createService();

    prisma.workspace.updateMany.mockResolvedValue({ count: 1 });

    jest.spyOn(service as any, 'readAllCustomSpaces').mockResolvedValue({
      'workspace-1': [
        {
          id: 'space-1',
          ownerWorkspaceId: 'workspace-1',
          name: 'Storyboard Space',
          description: 'Custom space',
          protection: 'standard',
          sharedWorkspaceIds: [],
          createdAt: '2026-03-09T00:00:00.000Z'
        }
      ]
    });
    jest.spyOn(service as any, 'writeCustomSpacesStore').mockRejectedValue(
      Object.assign(new Error('permission denied'), { code: 'EACCES' })
    );

    await expect(
      service.deleteCustomSpace('workspace-1', 'space-1', ['workspace-1'])
    ).resolves.toEqual({
      success: true,
      deleted: true
    });

    expect(prisma.workspace.updateMany).toHaveBeenCalledTimes(1);
  });
});
