import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const ACCOUNT_ITEM_ID_MULTIPLIER = -1;

function toNumber(value) {
  if (value === null || value === undefined) return value;
  return Number(value);
}

function accountItemId(accountId) {
  return Number(accountId) * ACCOUNT_ITEM_ID_MULTIPLIER;
}

function parseItemLikeId(id) {
  const numericId = Number(id);
  return numericId < 0
    ? { kind: "account", id: Math.abs(numericId) }
    : { kind: "item", id: numericId };
}

function toLegacyItem(item) {
  if (!item) return null;
  return {
    item_id: item.id,
    id: item.id,
    category_id: item.categoryId,
    categoryId: item.categoryId,
    user_id: item.category?.userId,
    userId: item.category?.userId,
    name: item.name,
    description: item.description,
    cost: toNumber(item.targetAmount),
    balance: toNumber(item.allocatedAmount),
    targetAmount: toNumber(item.targetAmount),
    allocatedAmount: toNumber(item.allocatedAmount),
    allocationPercent: toNumber(item.allocationPercent),
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toLegacyMainAccount(account) {
  if (!account) return null;
  return {
    item_id: accountItemId(account.id),
    id: account.id,
    accountId: account.id,
    category_id: null,
    categoryId: null,
    user_id: account.userId,
    userId: account.userId,
    name: "Main Account",
    description: "Main Account",
    cost: null,
    balance: toNumber(account.balance),
    targetAmount: null,
    allocatedAmount: toNumber(account.balance),
    allocationPercent: null,
    status: "ACTIVE",
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function postItem(item) {
  const {
    name,
    description = null,
    cost = null,
    balance = 0,
    targetAmount = cost,
    allocatedAmount = balance,
    allocationPercent = 0,
    status = "ACTIVE",
    category_id = null,
    categoryId = category_id,
    user_id = null,
  } = item;
  console.log(
    "ITEM spelled out: ",
    name,
    description,
    targetAmount,
    allocatedAmount,
    categoryId,
    user_id,
  );

  try {
    if (categoryId === null || categoryId === undefined) {
      await prisma.account.upsert({
        where: { userId: Number(user_id) },
        update: { balance: allocatedAmount ?? 0 },
        create: { userId: Number(user_id), balance: allocatedAmount ?? 0 },
      });
      return 1;
    }

    await prisma.item.create({
      data: {
        name,
        description,
        targetAmount: targetAmount ?? 0,
        allocatedAmount: allocatedAmount ?? 0,
        allocationPercent,
        status,
        categoryId: Number(categoryId),
      },
    });
    return 1;
  } catch (error) {
    if (error.code === "P2011") {
      console.log("Name must have a value");
      return "Name must have a value";
    }
    console.log("Error creating item: ", error);
    return error;
  }
}

export async function getItemBy(user_id, type, value) {
  value = !value ? null : value;
  console.log("inputs: ", user_id, type, value);

  const allowedColumns = [
    "item_id",
    "id",
    "name",
    "description",
    "cost",
    "targetAmount",
    "balance",
    "allocatedAmount",
    "category_id",
    "categoryId",
    "user_id",
    "userId",
    "status",
  ];
  if (type && !allowedColumns.includes(type)) {
    throw new Error(`Invalid column name provided. type: ${type} not allowed`);
  }

  try {
    if (type === "category_id" && value === null && user_id) {
      const account = await prisma.account.findUnique({
        where: { userId: Number(user_id) },
      });
      return account ? [toLegacyMainAccount(account)] : [];
    }

    const where = {};
    if (user_id) {
      where.category = { userId: Number(user_id) };
    }

    if (type && value !== null) {
      switch (type) {
        case "item_id":
        case "id":
          where.id = Number(value);
          break;
        case "category_id":
        case "categoryId":
          where.categoryId = Number(value);
          break;
        case "user_id":
        case "userId":
          where.category = { userId: Number(value) };
          break;
        case "cost":
        case "targetAmount":
          where.targetAmount = new Prisma.Decimal(value);
          break;
        case "balance":
        case "allocatedAmount":
          where.allocatedAmount = new Prisma.Decimal(value);
          break;
        default:
          where[type] = value;
      }
    }

    const items = await prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "asc" },
    });
    console.log("items: ", items);
    return items.map(toLegacyItem);
  } catch (error) {
    console.log("Error getting item: ", error);
    return null;
  }
}

export async function updateItem(
  item_id,
  name,
  description,
  cost,
  balance,
  category_id,
  user_id,
) {
  const parsedId = parseItemLikeId(item_id);

  try {
    if (parsedId.kind === "account") {
      await prisma.account.updateMany({
        where: { id: parsedId.id, userId: Number(user_id) },
        data: { balance: balance ?? 0 },
      });
      return null;
    }

    const data = {
      name,
      description,
      targetAmount: cost ?? 0,
      allocatedAmount: balance ?? 0,
    };

    if (category_id !== null && category_id !== undefined) {
      data.categoryId = Number(category_id);
    }

    await prisma.item.updateMany({
      where: { id: parsedId.id, category: { userId: Number(user_id) } },
      data,
    });
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function deleteItem(item_id, user_id) {
  const parsedId = parseItemLikeId(item_id);

  if (parsedId.kind === "account") {
    return "Main Account cannot be deleted";
  }

  try {
    await prisma.item.deleteMany({
      where: { id: parsedId.id, category: { userId: Number(user_id) } },
    });
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function transfer(item_id1, item_id2, amount, user_id) {
  const from = parseItemLikeId(item_id1);
  const to = parseItemLikeId(item_id2);
  const transferAmount = new Prisma.Decimal(amount ?? 0);

  try {
    await prisma.$transaction(async (tx) => {
      await adjustBalance(tx, from, user_id, transferAmount.negated());
      await adjustBalance(tx, to, user_id, transferAmount);
    });
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function adjustBalance(tx, target, user_id, amountDelta) {
  if (target.kind === "account") {
    await tx.account.updateMany({
      where: { id: target.id, userId: Number(user_id) },
      data: { balance: { increment: amountDelta } },
    });
    return;
  }

  await tx.item.updateMany({
    where: { id: target.id, category: { userId: Number(user_id) } },
    data: { allocatedAmount: { increment: amountDelta } },
  });
}
