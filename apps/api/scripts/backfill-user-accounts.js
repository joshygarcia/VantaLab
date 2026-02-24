/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function collectKnownUserIds() {
  const [workflowIds, workspaceIds, creditBalanceIds, transactionIds] = await Promise.all([
    prisma.workflowJob.findMany({ select: { userId: true }, distinct: ['userId'] }),
    prisma.workspace.findMany({ select: { userId: true }, distinct: ['userId'] }),
    prisma.userCreditBalance.findMany({ select: { userId: true }, distinct: ['userId'] }),
    prisma.creditTransaction.findMany({ select: { userId: true }, distinct: ['userId'] })
  ]);

  const ids = new Set();
  [workflowIds, workspaceIds, creditBalanceIds, transactionIds].forEach((rows) => {
    rows.forEach((row) => {
      if (typeof row.userId === 'string' && row.userId.trim().length > 0) {
        ids.add(row.userId.trim());
      }
    });
  });

  return Array.from(ids);
}

async function run() {
  const userIds = await collectKnownUserIds();

  if (userIds.length === 0) {
    console.log('No historical user IDs found. Nothing to backfill.');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const existing = await prisma.userAccount.findUnique({ where: { id: userId } });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.userAccount.create({
      data: {
        id: userId,
        role: 'MEMBER'
      }
    });

    created += 1;
  }

  console.log(
    JSON.stringify(
      {
        scannedUserIds: userIds.length,
        created,
        skipped
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
