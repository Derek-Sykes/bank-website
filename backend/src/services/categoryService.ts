import { prisma } from "./prisma.js";

export interface CategoryInput {
  name: string;
  description?: string | null;
  user_id: number;
}

export async function createCategory(category: CategoryInput): Promise<void> {
  await prisma.category.create({
    data: {
      name: category.name,
      description: category.description ?? null,
      user_id: category.user_id,
    },
  });
}

export async function getCategories(user_id: number) {
  return prisma.category.findMany({
    where: { user_id },
    orderBy: { category_id: "asc" },
  });
}

export async function updateCategory(
  category_id: number,
  name: string,
  description: string | null,
  user_id: number,
): Promise<void> {
  await prisma.category.updateMany({
    where: { category_id, user_id },
    data: { name, description },
  });
}

export async function deleteCategory(
  category_id: number,
  user_id: number,
): Promise<void> {
  await prisma.category.deleteMany({ where: { category_id, user_id } });
}
