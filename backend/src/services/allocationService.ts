import { prisma, type PrismaTransaction } from "../lib/prisma.ts";
import { ApiErrorCode, assertApi } from "../lib/apiError.ts";
import {
  assertActiveItemPercentagesSumTo100,
  assertCategoryPercentagesSumTo100,
  assertFullyFundedItemsHaveZeroAllocation,
  assertNonNegativeBalances,
  isFullyFunded,
  toNumber,
} from "./invariantService.ts";
import { createNotification } from "./notificationService.ts";
import { recordActivity } from "./activityService.ts";

export async function validateUserInvariants(
  user_id: number,
  tx: PrismaTransaction = prisma,
) {
  const [categories, items] = await Promise.all([
    tx.category.findMany({ where: { user_id } }),
    tx.item.findMany({ where: { user_id } }),
  ]);

  assertCategoryPercentagesSumTo100(categories);
  assertActiveItemPercentagesSumTo100(items);
  assertFullyFundedItemsHaveZeroAllocation(items);
  assertNonNegativeBalances(items);
}

export async function setCategoryAllocations(
  user_id: number,
  allocations: Array<{ category_id: number; allocation_percent: number }>,
) {
  return prisma.$transaction(async (tx) => {
    const categories = await tx.category.findMany({ where: { user_id } });
    const nextCategories = categories.map((category) => {
      const allocation = allocations.find(
        (item) => Number(item.category_id) === category.category_id,
      );
      return allocation
        ? {
            ...category,
            allocation_percent: toNumber(allocation.allocation_percent),
          }
        : category;
    });
    assertCategoryPercentagesSumTo100(nextCategories);

    for (const allocation of allocations) {
      const result = await tx.category.updateMany({
        where: { category_id: Number(allocation.category_id), user_id },
        data: { allocation_percent: toNumber(allocation.allocation_percent) },
      });
      assertApi(
        result.count === 1,
        404,
        ApiErrorCode.NOT_FOUND,
        "Category not found.",
        { category_id: allocation.category_id },
      );
    }

    await recordActivity(
      {
        user_id,
        type: "CATEGORY_ALLOCATIONS_UPDATED",
        metadata: { allocations },
      },
      tx,
    );
    return tx.category.findMany({ where: { user_id } });
  });
}

export async function setItemAllocations(
  user_id: number,
  allocations: Array<{ item_id: number; allocation_percent: number }>,
) {
  return prisma.$transaction(async (tx) => {
    const items = await tx.item.findMany({ where: { user_id } });
    const nextItems = items.map((item) => {
      const allocation = allocations.find(
        (row) => Number(row.item_id) === item.item_id,
      );
      return allocation
        ? {
            ...item,
            allocation_percent: toNumber(allocation.allocation_percent),
          }
        : item;
    });
    assertFullyFundedItemsHaveZeroAllocation(nextItems);
    assertActiveItemPercentagesSumTo100(nextItems);

    for (const allocation of allocations) {
      const result = await tx.item.updateMany({
        where: { item_id: Number(allocation.item_id), user_id },
        data: { allocation_percent: toNumber(allocation.allocation_percent) },
      });
      assertApi(
        result.count === 1,
        404,
        ApiErrorCode.NOT_FOUND,
        "Item not found.",
        { item_id: allocation.item_id },
      );
    }

    await recordActivity(
      { user_id, type: "ITEM_ALLOCATIONS_UPDATED", metadata: { allocations } },
      tx,
    );
    return tx.item.findMany({ where: { user_id } });
  });
}

export async function autoAllocateMoney(
  user_id: number,
  amount: number,
  tx: PrismaTransaction,
) {
  const categories = await tx.category.findMany({ where: { user_id } });
  const items = await tx.item.findMany({ where: { user_id } });

  if (categories.length === 0) return 0;
  assertCategoryPercentagesSumTo100(categories);
  assertFullyFundedItemsHaveZeroAllocation(items);

  const activeItems = items.filter(
    (item) =>
      item.status === "ACTIVE" &&
      item.category_id !== null &&
      !isFullyFunded(item),
  );
  if (activeItems.length === 0) return 0;
  assertActiveItemPercentagesSumTo100(activeItems);

  let totalAllocated = 0;

  for (const category of categories) {
    const categoryShare =
      amount * (toNumber(category.allocation_percent) / 100);
    const categoryItems = activeItems.filter(
      (item) => item.category_id === category.category_id,
    );
    if (categoryItems.length === 0) continue;

    for (const item of categoryItems) {
      const requested =
        categoryShare * (toNumber(item.allocation_percent) / 100);
      const cost = toNumber(item.cost, Number.POSITIVE_INFINITY);
      const balance = toNumber(item.balance);
      const capacity =
        cost === 0 ? Number.POSITIVE_INFINITY : Math.max(cost - balance, 0);
      const allocationAmount = Math.min(requested, capacity);
      if (allocationAmount <= 0) continue;
      totalAllocated += allocationAmount;

      const updated = await tx.item.update({
        where: { item_id: item.item_id },
        data: {
          balance: balance + allocationAmount,
          allocation_percent:
            balance + allocationAmount >= cost ? 0 : item.allocation_percent,
        },
      });

      if (isFullyFunded(updated)) {
        await createNotification(
          {
            user_id,
            code: "ITEM_FULLY_FUNDED",
            message: `${updated.name} is fully funded.`,
          },
          tx,
        );
      }
    }
  }

  await assertNoNegativeBalancesForUser(user_id, tx);
  return totalAllocated;
}

export async function assertNoNegativeBalancesForUser(
  user_id: number,
  tx: PrismaTransaction = prisma,
) {
  const items = await tx.item.findMany({ where: { user_id } });
  assertNonNegativeBalances(items);
}

export function assertPositiveAmount(amount: number) {
  assertApi(
    amount > 0,
    400,
    ApiErrorCode.INVALID_INPUT,
    "Amount must be greater than 0.",
    { amount },
  );
}
