import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface ItemInput {
  name: string;
  description?: string | null;
  cost?: number | null;
  balance?: number | null;
  category_id?: number | null;
  account_id?: number | null;
  user_id: number;
}

const allowedFilters = new Set([
  "item_id",
  "name",
  "description",
  "cost",
  "balance",
  "category_id",
  "account_id",
  "user_id",
]);

export async function createItem(item: ItemInput): Promise<void> {
  await prisma.item.create({
    data: {
      name: item.name,
      description: item.description ?? null,
      cost: item.cost ?? null,
      balance: item.balance ?? 0,
      category_id: item.category_id ?? null,
      account_id: item.account_id ?? null,
      user_id: item.user_id,
    },
  });
}

export async function getItemsBy(
  user_id: number | null,
  type?: string,
  value?: string | number | null,
) {
  const where: Prisma.ItemWhereInput = {};

  if (user_id !== null) {
    where.user_id = user_id;
  }

  if (type) {
    if (!allowedFilters.has(type)) {
      throw new Error(
        `Invalid column name provided. type: ${type} not allowed`,
      );
    }

    where[type as keyof Prisma.ItemWhereInput] = normalizeFilterValue(
      type,
      value,
    ) as never;
  }

  return prisma.item.findMany({
    where,
    orderBy: { item_id: "asc" },
  });
}

export async function updateItem(
  item_id: number,
  item: Partial<Omit<ItemInput, "user_id">>,
  user_id: number,
): Promise<void> {
  const data: Prisma.ItemUncheckedUpdateManyInput = {};

  if (item.name !== undefined) data.name = item.name;
  if (item.description !== undefined) data.description = item.description;
  if (item.cost !== undefined) data.cost = item.cost;
  if (item.balance !== undefined && item.balance !== null)
    data.balance = item.balance;
  if (item.category_id !== undefined) data.category_id = item.category_id;
  if (item.account_id !== undefined) data.account_id = item.account_id;

  await prisma.item.updateMany({
    where: { item_id, user_id },
    data,
  });
}

export async function deleteItem(
  item_id: number,
  user_id: number,
): Promise<void> {
  await prisma.item.deleteMany({ where: { item_id, user_id } });
}

export async function transfer(
  item_id1: number,
  item_id2: number,
  amount: number,
  user_id: number,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const items = await tx.item.findMany({
      where: { item_id: { in: [item_id1, item_id2] }, user_id },
      select: { item_id: true },
    });

    if (items.length !== 2) {
      throw new Error(
        "Both items must exist and belong to the authenticated user",
      );
    }

    await tx.item.update({
      where: { item_id: item_id1 },
      data: { balance: { decrement: amount } },
    });
    await tx.item.update({
      where: { item_id: item_id2 },
      data: { balance: { increment: amount } },
    });
  });
}

function normalizeFilterValue(
  type: string,
  value?: string | number | null,
): string | number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (["item_id", "category_id", "account_id", "user_id"].includes(type)) {
    return Number(value);
  }

  if (["cost", "balance"].includes(type)) {
    return Number(value);
  }

  return String(value);
}
