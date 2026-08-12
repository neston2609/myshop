import { prisma } from "@/lib/prisma";

const defaultRetentionDays = 7;

function normalizeRetentionDays(value?: number | null) {
  if (!Number.isFinite(value || 0)) return defaultRetentionDays;
  return Math.max(1, Math.min(365, Math.trunc(value || defaultRetentionDays)));
}

export async function cleanupExpiredLiveChatConversations(retentionDays?: number | null) {
  let days = retentionDays;

  if (days == null) {
    const settings = await prisma.siteSettings.findFirst({
      select: { liveChatRetentionDays: true },
    });
    days = settings?.liveChatRetentionDays ?? defaultRetentionDays;
  }

  const cutoff = new Date(Date.now() - normalizeRetentionDays(days) * 24 * 60 * 60 * 1000);
  return prisma.liveChatConversation.deleteMany({
    where: {
      updatedAt: {
        lt: cutoff,
      },
    },
  });
}
