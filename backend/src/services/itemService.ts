import { prisma } from "../lib/prisma.ts";
import { ApiErrorCode, assertApi } from "../lib/apiError.ts";
import { recordActivity } from "./activityService.ts";
import { validateUserInvariants } from "./allocationService.ts";
import { isFullyFunded, toNumber } from "./invariantService.ts";

const ALLOWED_ITEM_COLUMNS = new Set([
  "item_id",
  "name",
  "description",
  "cost",
  "balance",
  "category_id",
  "user_id",
  "allocation_percent",
  "status",
]);

export async function getItems(
  user_id: number | null,
  type?: string,
  value?: unknown,
) {
  if (type)
    assertApi(
      ALLOWED_ITEM_COLUMNS.has(type),
      400,
      ApiErrorCode.INVALID_INPUT,
      `Invalid item filter: ${type}`,
    );

  const where: Record<string, unknown> = {};
  if (user_id) where.user_id = user_id;
  if (type)
    where[type] =
      value === undefined || value === "" || value === "null" ? null : value;

  return prisma.item.findMany({ where });
}

export async function createItem(
  user_id: number,
  input: {
    name: string;
    description?: string | null;
    cost?: number | null;
    balance?: number | null;
    category_id?: number | null;
    allocation_percent?: number;
  },
) {
  assertApi(
    input?.name,
    400,
    ApiErrorCode.INVALID_INPUT,
    "Item name is required.",
  );
  const balance = toNumber(input.balance, 0);
  const cost =
    input.cost === null || input.cost === undefined
      ? null
      : toNumber(input.cost);
  assertApi(
    balance >= 0,
    400,
    ApiErrorCode.NEGATIVE_BALANCE,
    "Item balance cannot be negative.",
  );
  assertApi(
    cost === null || cost >= balance,
    400,
    ApiErrorCode.INVALID_INPUT,
    "Cost cannot be lower than balance.",
  );

  return prisma.$transaction(async (tx) => {
    if (input.category_id) {
      const category = await tx.category.findFirst({
        where: { category_id: Number(input.category_id), user_id },
      });
      assertApi(category, 404, ApiErrorCode.NOT_FOUND, "Category not found.");
    }

    const item = await tx.item.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        cost,
        balance,
        category_id: input.category_id === undefined ? null : input.category_id,
        user_id,
        allocation_percent: toNumber(input.allocation_percent, 0),
      },
    });
    await validateUserInvariants(user_id, tx);
    await recordActivity(
      {
        user_id,
        item_id: item.item_id,
        type: "ITEM_CREATED",
        metadata: { item_id: item.item_id },
      },
      tx,
    );
    return item;
  });
}

export async function updateItem(
  user_id: number,
  item_id: number,
  input: {
    name?: string | null;
    description?: string | null;
    cost?: number | null;
    balance?: number | null;
    category_id?: number | null;
    allocation_percent?: number | null;
    status?: string | null;
  },
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.item.findFirst({ where: { user_id, item_id } });
    assertApi(existing, 404, ApiErrorCode.NOT_FOUND, "Item not found.");

    const nextBalance =
      input.balance === undefined || input.balance === null
        ? toNumber(existing.balance)
        : toNumber(input.balance);
    const nextCost =
      input.cost === undefined
        ? existing.cost
        : input.cost === null
          ? null
          : toNumber(input.cost);
    assertApi(
      nextBalance >= 0,
      400,
      ApiErrorCode.NEGATIVE_BALANCE,
      "Item balance cannot be negative.",
    );
    assertApi(
      nextCost === null || nextCost >= nextBalance,
      400,
      ApiErrorCode.INVALID_INPUT,
      "Cost cannot be lower than balance.",
    );

    if (input.category_id) {
      const category = await tx.category.findFirst({
        where: { category_id: Number(input.category_id), user_id },
      });
      assertApi(category, 404, ApiErrorCode.NOT_FOUND, "Category not found.");
    }

    const item = await tx.item.update({
      where: { item_id },
      data: {
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        cost: nextCost,
        balance: nextBalance,
        category_id:
          input.category_id === undefined
            ? existing.category_id
            : input.category_id,
        allocation_percent:
          input.allocation_percent === undefined ||
          input.allocation_percent === null
            ? existing.allocation_percent
            : toNumber(input.allocation_percent),
        status: input.status ?? existing.status,
      },
    });

    if (isFullyFunded(item) && item.allocation_percent !== 0) {
      await tx.item.update({
        where: { item_id },
        data: { allocation_percent: 0 },
      });
    }

    await validateUserInvariants(user_id, tx);
    await recordActivity(
      { user_id, item_id, type: "ITEM_UPDATED", metadata: { item_id } },
      tx,
    );
    return tx.item.findUnique({ where: { item_id } });
  });
}

export async function deleteItem(user_id: number, item_id: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.item.findFirst({ where: { user_id, item_id } });
    assertApi(existing, 404, ApiErrorCode.NOT_FOUND, "Item not found.");
    assertApi(
      toNumber(existing.balance) === 0,
      409,
      ApiErrorCode.INVALID_INPUT,
      "Move money out of this item before deleting it.",
    );
    await tx.item.delete({ where: { item_id } });
    await recordActivity(
      { user_id, item_id, type: "ITEM_DELETED", metadata: { item_id } },
      tx,
    );
  });
}
