import {
  buildStudioNotifications,
  getStudioNotificationBadgeCount
} from '../../../../web/src/components/studio/studio-topbar-notifications';

describe('buildStudioNotifications', () => {
  const now = new Date('2026-03-09T12:00:00.000Z');

  it('builds actionable studio alerts for credit, expiry, activity, and missing space', () => {
    const notifications = buildStudioNotifications({
      credits: 80,
      activeSpaceName: null,
      now,
      historyItems: [
        {
          id: 'run-1',
          workspaceId: 'workspace-1',
          model: 'kling-3.0/video',
          prompt: 'hero shot',
          mediaUrl: 'https://cdn.example.com/run-1.mp4',
          createdAt: '2026-03-09T10:00:00.000Z',
          expiresAt: '2026-03-10T10:00:00.000Z'
        }
      ]
    });

    expect(notifications.map((notification) => notification.id)).toEqual([
      'active-space',
      'credits-critical',
      'expiring-assets',
      'recent-runs'
    ]);
    expect(getStudioNotificationBadgeCount(notifications)).toBe(3);
  });

  it('falls back to informational badge count when there are no warnings', () => {
    const notifications = buildStudioNotifications({
      credits: 1200,
      activeSpaceName: 'Campaign Lab',
      now,
      historyItems: [
        {
          id: 'run-1',
          workspaceId: 'workspace-1',
          model: 'gpt-5-2',
          prompt: 'summary',
          mediaUrl: 'https://cdn.example.com/run-1.png',
          createdAt: '2026-03-09T11:00:00.000Z',
          expiresAt: '2026-03-20T10:00:00.000Z'
        }
      ]
    });

    expect(notifications.map((notification) => notification.id)).toEqual([
      'recent-runs',
      'latest-run'
    ]);
    expect(getStudioNotificationBadgeCount(notifications)).toBe(2);
  });
});
