import { prisma, type PrismaTransaction } from "../lib/prisma.ts";

type ActivityInput = {
  user_id: number;
  item_id?: number | null;
  type: string;
  amount?: number | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordActivity(
  input: ActivityInput,
  tx: PrismaTransaction = prisma,
) {
  return tx.activity.create({
    data: {
      user_id: input.user_id,
      item_id: input.item_id ?? null,
      type: input.type,
      amount: input.amount ?? null,
      metadata: (input.metadata as any) ?? undefined,
    },
  });
}

export async function listActivities(user_id: number) {
  return prisma.activity.findMany({
    where: { user_id },
    orderBy: { created_at: "desc" },
  });
}
