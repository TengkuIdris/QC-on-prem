import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedCategories() {
  const existingCategories = await prisma.categories.findMany();

  if (existingCategories.length > 0) {
    await prisma.$executeRaw`TRUNCATE TABLE "Categories" RESTART IDENTITY CASCADE;`;
  }

  const categories = [
    { name: "生産性向上", description: "productivity" },
    { name: "品質改善", description: "quality" },
    { name: "コスト削減", description: "cost" },
    { name: "安全性向上", description: "safety" },
    { name: "その他", description: "other" },
  ];

  await prisma.categories.createMany({ data: categories });
}
