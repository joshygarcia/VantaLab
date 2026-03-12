type NotificationHistoryItem = {
  id: string;
  workspaceId: string;
  model: string;
  prompt: string;
  mediaUrl: string;
  mediaUrls?: string[];
  createdAt: string;
  expiresAt: string;
};

export type StudioTopBarNotification = {
  id: string;
  tone: 'critical' | 'warning' | 'info';
  title: string;
  body: string;
  href: string;
};

type BuildStudioNotificationsInput = {
  credits: number | null;
  activeSpaceName?: string | null;
  historyItems: NotificationHistoryItem[];
  now: Date;
};

const HOURS_24_MS = 24 * 60 * 60 * 1000;
const DAYS_3_MS = 3 * 24 * 60 * 60 * 1000;

export const buildStudioNotifications = ({
  credits,
  activeSpaceName,
  historyItems,
  now
}: BuildStudioNotificationsInput): StudioTopBarNotification[] => {
  const notifications: StudioTopBarNotification[] = [];

  if (!activeSpaceName?.trim()) {
    notifications.push({
      id: 'active-space',
      tone: 'warning',
      title: 'Pick an active space',
      body: 'Select a project space before launching canvas or library workflows.',
      href: '/projects'
    });
  }

  if (typeof credits === 'number') {
    if (credits <= 100) {
      notifications.push({
        id: 'credits-critical',
        tone: 'critical',
        title: 'Credits are running low',
        body: `${credits} credits remaining. Top up before starting longer video jobs.`,
        href: '/billing'
      });
    } else if (credits <= 500) {
      notifications.push({
        id: 'credits-warning',
        tone: 'warning',
        title: 'Credit balance is getting low',
        body: `${credits} credits remaining across the studio.`,
        href: '/billing'
      });
    }
  }

  const expiringSoonCount = historyItems.filter((item) => {
    const expiresAtMs = new Date(item.expiresAt).getTime();
    const nowMs = now.getTime();
    return expiresAtMs >= nowMs && expiresAtMs - nowMs <= DAYS_3_MS;
  }).length;

  if (expiringSoonCount > 0) {
    notifications.push({
      id: 'expiring-assets',
      tone: 'warning',
      title: 'Assets are about to expire',
      body: `${expiringSoonCount} saved output${expiringSoonCount === 1 ? '' : 's'} expire within 3 days.`,
      href: '/history'
    });
  }

  const recentCount = historyItems.filter((item) => {
    const createdAtMs = new Date(item.createdAt).getTime();
    const nowMs = now.getTime();
    return createdAtMs <= nowMs && nowMs - createdAtMs <= HOURS_24_MS;
  }).length;

  if (recentCount > 0) {
    notifications.push({
      id: 'recent-runs',
      tone: 'info',
      title: 'New generations are ready',
      body: `${recentCount} generation${recentCount === 1 ? '' : 's'} completed in the last 24 hours.`,
      href: '/history'
    });
  }

  const latestItem = [...historyItems]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (latestItem) {
    notifications.push({
      id: 'latest-run',
      tone: 'info',
      title: 'Latest output available',
      body: `${latestItem.model} generated from workspace ${latestItem.workspaceId}.`,
      href: '/history'
    });
  }

  return notifications.slice(0, 4);
};

export const getStudioNotificationBadgeCount = (notifications: StudioTopBarNotification[]) =>
  notifications.filter((notification) => notification.tone !== 'info').length || notifications.length;
