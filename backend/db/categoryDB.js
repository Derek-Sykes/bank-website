import { prisma } from "../lib/prisma.js";

function toNumber(value) {
  if (value === null || value === undefined) return value;
  return Number(value);
}

function toLegacyCategory(category) {
  if (!category) return null;
  return {
    category_id: category.id,
    id: category.id,
    user_id: category.userId,
    userId: category.userId,
    name: category.name,
    description: category.description,
    allocationPercent: toNumber(category.allocationPercent),
    unallocatedBalance: toNumber(category.unallocatedBalance),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export async function postCategory(category) {
  const {
    name,
    description = null,
    user_id = null,
    allocationPercent = 0,
    unallocatedBalance = 0,
  } = category;
  console.log("CATEGORY spelled out: ", name, description, user_id);
  try {
    await prisma.category.create({
      data: {
        name,
        description,
        userId: Number(user_id),
        allocationPercent,
        unallocatedBalance,
      },
    });
    return 1;
  } catch (error) {
    if (error.code === "P2011") {
      console.log("Name must have a value");
      return "Name must have a value";
    }
    console.log("Error creating category: ", error);
    return error;
  }
}

export async function getCategorys(user_id) {
  console.log("user_id: ", user_id);

  try {
    const categorys = await prisma.category.findMany({
      where: { userId: Number(user_id) },
      orderBy: { createdAt: "asc" },
    });
    console.log("categorys: ", categorys);
    return categorys.map(toLegacyCategory);
  } catch (error) {
    console.log("Error getting category: ", error);
    return null;
  }
}

export async function updateCategory(category_id, name, description, user_id) {
  try {
    await prisma.category.updateMany({
      where: { id: Number(category_id), userId: Number(user_id) },
      data: { name, description },
    });
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function deleteCategory(category_id, user_id) {
  try {
    await prisma.category.deleteMany({
      where: { id: Number(category_id), userId: Number(user_id) },
    });
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}
