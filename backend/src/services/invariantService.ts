import { ApiError, ApiErrorCode, assertApi } from "../lib/apiError.ts";

const EPSILON = 0.000001;

export function toNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ApiError(
      400,
      ApiErrorCode.INVALID_INPUT,
      "Expected a finite number.",
      { value },
    );
  }
  return parsed;
}

export function assertNonNegativeBalances(
  items: Array<{ item_id: number; balance: number | null }>,
) {
  const negative = items.find((item) => toNumber(item.balance) < -EPSILON);
  assertApi(
    !negative,
    409,
    ApiErrorCode.NEGATIVE_BALANCE,
    "Balances cannot be negative.",
    negative,
  );
}

export function assertCategoryPercentagesSumTo100(
  categories: Array<{ category_id: number; allocation_percent: number }>,
) {
  if (categories.length === 0) return;
  const total = categories.reduce(
    (sum, category) => sum + toNumber(category.allocation_percent),
    0,
  );
  assertApi(
    Math.abs(total - 100) < EPSILON,
    409,
    ApiErrorCode.CATEGORY_PERCENT_TOTAL_INVALID,
    "Category allocation percentages must sum to 100.",
    { total },
  );
}

export function assertActiveItemPercentagesSumTo100(
  items: Array<{
    item_id: number;
    category_id?: number | null;
    cost: number | null;
    balance: number | null;
    allocation_percent: number;
    status: string;
  }>,
) {
  const active = items.filter(
    (item) =>
      item.status === "ACTIVE" &&
      item.category_id !== null &&
      !isFullyFunded(item),
  );
  const categoryIds = [...new Set(active.map((item) => item.category_id))];

  for (const category_id of categoryIds) {
    const categoryItems = active.filter(
      (item) => item.category_id === category_id,
    );
    const total = categoryItems.reduce(
      (sum, item) => sum + toNumber(item.allocation_percent),
      0,
    );
    assertApi(
      Math.abs(total - 100) < EPSILON,
      409,
      ApiErrorCode.ITEM_PERCENT_TOTAL_INVALID,
      "Active item allocation percentages must sum to 100 within each category.",
      { category_id, total },
    );
  }
}

export function assertFullyFundedItemsHaveZeroAllocation(
  items: Array<{
    item_id: number;
    cost: number | null;
    balance: number | null;
    allocation_percent: number;
  }>,
) {
  const invalid = items.find(
    (item) =>
      isFullyFunded(item) &&
      Math.abs(toNumber(item.allocation_percent)) > EPSILON,
  );
  assertApi(
    !invalid,
    409,
    ApiErrorCode.FULLY_FUNDED_ITEM_HAS_ALLOCATION,
    "Fully funded items must have 0 allocation percent.",
    invalid,
  );
}

export function totalCash(items: Array<{ balance: number | null }>) {
  return items.reduce((sum, item) => sum + toNumber(item.balance), 0);
}

export function isFullyFunded(item: {
  cost: number | null;
  balance: number | null;
}) {
  const cost = toNumber(item.cost, 0);
  return cost > 0 && toNumber(item.balance) >= cost - EPSILON;
}

export function assertCashReduced(
  before: number,
  after: number,
  amount: number,
) {
  assertApi(
    Math.abs(after - (before - amount)) < EPSILON,
    409,
    ApiErrorCode.PURCHASE_CASH_INVARIANT_FAILED,
    "Purchases must reduce total simulated cash by the purchase amount.",
    { before, after, amount },
  );
}

export function assertCashPreserved(before: number, after: number) {
  assertApi(
    Math.abs(after - before) < EPSILON,
    409,
    ApiErrorCode.CANCEL_CASH_INVARIANT_FAILED,
    "Cancels must preserve total simulated cash.",
    { before, after },
  );
}
