import { prisma, type PrismaTransaction } from "../lib/prisma.ts";

type NotificationInput = {
  user_id: number;
  code: string;
  message: string;
};

export async function createNotification(
  input: NotificationInput,
  tx: PrismaTransaction = prisma,
) {
  return tx.notification.create({ data: input });
}

export async function listNotifications(user_id: number) {
  return prisma.notification.findMany({
    where: { user_id },
    orderBy: { created_at: "desc" },
  });
}

export async function markNotificationRead(
  user_id: number,
  notification_id: number,
) {
  return prisma.notification.updateMany({
    where: { notification_id, user_id },
    data: { read_at: new Date() },
  });
}
