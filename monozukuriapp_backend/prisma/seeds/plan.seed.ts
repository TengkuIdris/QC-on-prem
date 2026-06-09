// import { PrismaClient, PlanTypeEnum } from "@prisma/client";

// const prisma = new PrismaClient();

export async function seedPlans() {
//   // Check if there are existing plans
//   const existingPlans = await prisma.plan.findMany();

//   if (existingPlans.length > 0) {
//     // Truncate the table and reset identity
//     await prisma.$executeRaw`TRUNCATE TABLE "Plan" RESTART IDENTITY CASCADE;`;
//   }

//   const plans = [
//     { type: PlanTypeEnum.PLAN_A, name: "アカウント無し" },
//     { type: PlanTypeEnum.PLAN_B, name: "アカウントあり無課金" },
//     { type: PlanTypeEnum.PLAN_C, name: "課金" },
//     { type: PlanTypeEnum.PLAN_D, name: "課金" },
//     { type: PlanTypeEnum.PLAN_E, name: "課金" },
//   ];

//   // Create plans
//   await prisma.plan.createMany({ data: plans });
}
