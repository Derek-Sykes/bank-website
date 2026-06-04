import { prisma } from "../lib/prisma.ts";
import { ApiErrorCode, assertApi } from "../lib/apiError.ts";
import {
  autoAllocateMoney,
  assertNoNegativeBalancesForUser,
  assertPositiveAmount,
  validateUserInvariants,
} from "./allocationService.ts";
import { recordActivity } from "./activityService.ts";
import {
  assertCashPreserved,
  assertCashReduced,
  totalCash,
  toNumber,
} from "./invariantService.ts";

async function getMainAccount(user_id: number, tx: any = prisma) {
  const main = await tx.item.findFirst({
    where: { user_id, category_id: null, name: "Main Account" },
  });
  assertApi(main, 404, ApiErrorCode.NOT_FOUND, "Main Account not found.");
  return main;
}

export async function addMoney(user_id: number, amountInput: number) {
  const amount = toNumber(amountInput);
  assertPositiveAmount(amount);

  return prisma.$transaction(async (tx) => {
    const main = await getMainAccount(user_id, tx);
    await tx.item.update({
      where: { item_id: main.item_id },
      data: { balance: toNumber(main.balance) + amount },
    });
    const allocated = await autoAllocateMoney(user_id, amount, tx);
    const currentMain = await tx.item.findUnique({
      where: { item_id: main.item_id },
    });
    await tx.item.update({
      where: { item_id: main.item_id },
      data: { balance: toNumber(currentMain?.balance) - allocated },
    });
    await validateUserInvariants(user_id, tx);
    await recordActivity(
      {
        user_id,
        item_id: main.item_id,
        type: "ADD_MONEY",
        amount,
        metadata: { allocated },
      },
      tx,
    );
    return tx.item.findMany({ where: { user_id } });
  });
}

export async function transfer(
  user_id: number,
  from_item_id: number,
  to_item_id: number,
  amountInput: number,
) {
  const amount = toNumber(amountInput);
  assertPositiveAmount(amount);

  return prisma.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.item.findFirst({ where: { user_id, item_id: Number(from_item_id) } }),
      tx.item.findFirst({ where: { user_id, item_id: Number(to_item_id) } }),
    ]);
    assertApi(
      from && to,
      404,
      ApiErrorCode.NOT_FOUND,
      "Transfer item not found.",
    );
    assertApi(
      toNumber(from.balance) >= amount,
      409,
      ApiErrorCode.INSUFFICIENT_FUNDS,
      "Insufficient funds for transfer.",
    );

    await tx.item.update({
      where: { item_id: from.item_id },
      data: { balance: toNumber(from.balance) - amount },
    });
    await tx.item.update({
      where: { item_id: to.item_id },
      data: { balance: toNumber(to.balance) + amount },
    });
    await assertNoNegativeBalancesForUser(user_id, tx);
    await recordActivity(
      {
        user_id,
        item_id: from.item_id,
        type: "TRANSFER_OUT",
        amount,
        metadata: { to_item_id },
      },
      tx,
    );
    await recordActivity(
      {
        user_id,
        item_id: to.item_id,
        type: "TRANSFER_IN",
        amount,
        metadata: { from_item_id },
      },
      tx,
    );
    return tx.item.findMany({ where: { user_id } });
  });
}

export async function purchase(
  user_id: number,
  item_id: number,
  amountInput?: number,
) {
  return prisma.$transaction(async (tx) => {
    const beforeItems = await tx.item.findMany({ where: { user_id } });
    const beforeCash = totalCash(beforeItems);
    const item = beforeItems.find((row) => row.item_id === Number(item_id));
    assertApi(item, 404, ApiErrorCode.NOT_FOUND, "Item not found.");

    const amount =
      amountInput === undefined || amountInput === null
        ? toNumber(item.cost)
        : toNumber(amountInput);
    assertPositiveAmount(amount);
    assertApi(
      toNumber(item.balance) >= amount,
      409,
      ApiErrorCode.INSUFFICIENT_FUNDS,
      "Insufficient funds for purchase.",
    );

    await tx.item.update({
      where: { item_id: item.item_id },
      data: {
        balance: toNumber(item.balance) - amount,
        allocation_percent: 0,
        status: "PURCHASED",
      },
    });

    const afterItems = await tx.item.findMany({ where: { user_id } });
    assertCashReduced(beforeCash, totalCash(afterItems), amount);
    await assertNoNegativeBalancesForUser(user_id, tx);
    await recordActivity(
      { user_id, item_id: item.item_id, type: "PURCHASE", amount },
      tx,
    );
    return tx.item.findUnique({ where: { item_id: item.item_id } });
  });
}

export async function cancel(user_id: number, item_id: number) {
  return prisma.$transaction(async (tx) => {
    const beforeItems = await tx.item.findMany({ where: { user_id } });
    const beforeCash = totalCash(beforeItems);
    const item = beforeItems.find((row) => row.item_id === Number(item_id));
    assertApi(item, 404, ApiErrorCode.NOT_FOUND, "Item not found.");
    const main = await getMainAccount(user_id, tx);
    const amount = toNumber(item.balance);

    if (amount > 0 && item.item_id !== main.item_id) {
      await tx.item.update({
        where: { item_id: main.item_id },
        data: { balance: toNumber(main.balance) + amount },
      });
    }

    await tx.item.update({
      where: { item_id: item.item_id },
      data: { balance: 0, allocation_percent: 0, status: "CANCELED" },
    });
    const afterItems = await tx.item.findMany({ where: { user_id } });
    assertCashPreserved(beforeCash, totalCash(afterItems));
    await assertNoNegativeBalancesForUser(user_id, tx);
    await recordActivity(
      { user_id, item_id: item.item_id, type: "CANCEL", amount },
      tx,
    );
    return tx.item.findMany({ where: { user_id } });
  });
}
