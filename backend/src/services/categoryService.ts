import { prisma } from "../lib/prisma.ts";
import { ApiErrorCode, assertApi } from "../lib/apiError.ts";
import { validateUserInvariants } from "./allocationService.ts";
import { recordActivity } from "./activityService.ts";
import { toNumber } from "./invariantService.ts";

export async function listCategories(user_id: number, category_id?: number) {
  if (category_id)
    return prisma.category.findFirst({ where: { user_id, category_id } });
  return prisma.category.findMany({ where: { user_id } });
}

export async function createCategory(
  user_id: number,
  input: {
    name: string;
    description?: string | null;
    allocation_percent?: number;
  },
) {
  assertApi(
    input?.name,
    400,
    ApiErrorCode.INVALID_INPUT,
    "Category name is required.",
  );
  return prisma.category.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      allocation_percent: toNumber(input.allocation_percent, 0),
      user_id,
    },
  });
}

export async function updateCategory(
  user_id: number,
  category_id: number,
  input: {
    name?: string;
    description?: string | null;
    allocation_percent?: number;
  },
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findFirst({
      where: { user_id, category_id },
    });
    assertApi(existing, 404, ApiErrorCode.NOT_FOUND, "Category not found.");
    const category = await tx.category.update({
      where: { category_id },
      data: {
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        allocation_percent:
          input.allocation_percent === undefined
            ? existing.allocation_percent
            : toNumber(input.allocation_percent),
      },
    });
    await validateUserInvariants(user_id, tx);
    await recordActivity(
      { user_id, type: "CATEGORY_UPDATED", metadata: { category_id } },
      tx,
    );
    return category;
  });
}

export async function deleteCategory(user_id: number, category_id: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findFirst({
      where: { user_id, category_id },
    });
    assertApi(existing, 404, ApiErrorCode.NOT_FOUND, "Category not found.");
    await tx.category.delete({ where: { category_id } });
    await recordActivity(
      { user_id, type: "CATEGORY_DELETED", metadata: { category_id } },
      tx,
    );
  });
}
