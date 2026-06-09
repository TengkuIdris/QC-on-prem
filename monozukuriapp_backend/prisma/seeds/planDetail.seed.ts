import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const detailPlanA = [
  { planId: 1, actionId: 1, enableFlag: true },
  //Parento
  { planId: 1, actionId: 2, enableFlag: false },
  { planId: 1, actionId: 3, enableFlag: false },
  { planId: 1, actionId: 4, enableFlag: false },
  { planId: 1, actionId: 5, enableFlag: false, limitedUsage: 0 },
  { planId: 1, actionId: 6, enableFlag: false },
  { planId: 1, actionId: 7, enableFlag: false },
  { planId: 1, actionId: 8, enableFlag: false },
  //Fishbone
  { planId: 1, actionId: 9, enableFlag: false },
  { planId: 1, actionId: 10, enableFlag: false },
  { planId: 1, actionId: 11, enableFlag: false },
  { planId: 1, actionId: 12, enableFlag: false },
  { planId: 1, actionId: 13, enableFlag: false },
  { planId: 1, actionId: 14, enableFlag: false, limitedUsage: 0 },
  { planId: 1, actionId: 15, enableFlag: false, limitedUsage: 0 },
  //FTA
  { planId: 1, actionId: 16, enableFlag: false },
  { planId: 1, actionId: 17, enableFlag: false },
  { planId: 1, actionId: 18, enableFlag: false },
  { planId: 1, actionId: 19, enableFlag: false },
  { planId: 1, actionId: 20, enableFlag: false },
  { planId: 1, actionId: 21, enableFlag: false, limitedUsage: 0 },
  { planId: 1, actionId: 22, enableFlag: false, limitedUsage: 0 },
  //Why-why
  { planId: 1, actionId: 23, enableFlag: false },
  { planId: 1, actionId: 24, enableFlag: false },
  //Kaizen Hub
  { planId: 1, actionId: 25, enableFlag: false },
  { planId: 1, actionId: 26, enableFlag: false },
];

const detailPlanB = [
  { planId: 2, actionId: 1, enableFlag: true },
  //Parento
  { planId: 2, actionId: 2, enableFlag: true },
  { planId: 2, actionId: 3, enableFlag: false },
  { planId: 2, actionId: 4, enableFlag: false },
  { planId: 2, actionId: 5, enableFlag: false, limitedUsage: 0 },
  { planId: 2, actionId: 6, enableFlag: false },
  { planId: 2, actionId: 7, enableFlag: false },
  { planId: 2, actionId: 8, enableFlag: false },
  //Fishbone
  { planId: 2, actionId: 9, enableFlag: true },
  { planId: 2, actionId: 10, enableFlag: false },
  { planId: 2, actionId: 11, enableFlag: false },
  { planId: 2, actionId: 12, enableFlag: false },
  { planId: 2, actionId: 13, enableFlag: false },
  { planId: 2, actionId: 14, enableFlag: false, limitedUsage: 0 },
  { planId: 2, actionId: 15, enableFlag: false, limitedUsage: 0 },
  //FTA
  { planId: 2, actionId: 16, enableFlag: false },
  { planId: 2, actionId: 17, enableFlag: false },
  { planId: 2, actionId: 18, enableFlag: false },
  { planId: 2, actionId: 19, enableFlag: false },
  { planId: 2, actionId: 20, enableFlag: false },
  { planId: 2, actionId: 21, enableFlag: false, limitedUsage: 0 },
  { planId: 2, actionId: 22, enableFlag: false, limitedUsage: 0 },
  //Why-why
  { planId: 2, actionId: 23, enableFlag: false },
  { planId: 2, actionId: 24, enableFlag: false },
  //Kaizen Hub
  { planId: 2, actionId: 25, enableFlag: false },
  { planId: 2, actionId: 26, enableFlag: false },
];

const detailPlanC = [
  { planId: 3, actionId: 1, enableFlag: true },
  //Parento
  { planId: 3, actionId: 2, enableFlag: true },
  { planId: 3, actionId: 3, enableFlag: true },
  { planId: 3, actionId: 4, enableFlag: true },
  { planId: 3, actionId: 5, enableFlag: false, limitedUsage: 0 },
  { planId: 3, actionId: 6, enableFlag: false },
  { planId: 3, actionId: 7, enableFlag: true },
  { planId: 3, actionId: 8, enableFlag: false },
  //Fishbone
  { planId: 3, actionId: 9, enableFlag: true },
  { planId: 3, actionId: 10, enableFlag: true },
  { planId: 3, actionId: 11, enableFlag: true },
  { planId: 3, actionId: 12, enableFlag: false },
  { planId: 3, actionId: 13, enableFlag: true },
  { planId: 3, actionId: 14, enableFlag: false, limitedUsage: 0 },
  { planId: 3, actionId: 15, enableFlag: true, limitedUsage: 5000 },
  //FTA
  { planId: 3, actionId: 16, enableFlag: true },
  { planId: 3, actionId: 17, enableFlag: true },
  { planId: 3, actionId: 18, enableFlag: true },
  { planId: 3, actionId: 19, enableFlag: false },
  { planId: 3, actionId: 20, enableFlag: true },
  { planId: 3, actionId: 21, enableFlag: false, limitedUsage: 0 },
  { planId: 3, actionId: 22, enableFlag: true, limitedUsage: 5000 },
  //Why-why
  { planId: 3, actionId: 23, enableFlag: true },
  { planId: 3, actionId: 24, enableFlag: true },
  //Kaizen Hub
  { planId: 3, actionId: 25, enableFlag: true },
  { planId: 3, actionId: 26, enableFlag: true },
];

const detailPlanD = [
  { planId: 4, actionId: 1, enableFlag: true },
  //Parento
  { planId: 4, actionId: 2, enableFlag: true },
  { planId: 4, actionId: 3, enableFlag: true },
  { planId: 4, actionId: 4, enableFlag: true },
  { planId: 4, actionId: 5, enableFlag: true, limitedUsage: 3 },
  { planId: 4, actionId: 6, enableFlag: true },
  { planId: 4, actionId: 7, enableFlag: true },
  { planId: 4, actionId: 8, enableFlag: true },
  //Fishbone
  { planId: 4, actionId: 9, enableFlag: true },
  { planId: 4, actionId: 10, enableFlag: true },
  { planId: 4, actionId: 11, enableFlag: true },
  { planId: 4, actionId: 12, enableFlag: true },
  { planId: 4, actionId: 13, enableFlag: true },
  { planId: 4, actionId: 14, enableFlag: true, limitedUsage: 3 },
  { planId: 4, actionId: 15, enableFlag: true, limitedUsage: 30000 },
  //FTA
  { planId: 4, actionId: 16, enableFlag: true },
  { planId: 4, actionId: 17, enableFlag: true },
  { planId: 4, actionId: 18, enableFlag: true },
  { planId: 4, actionId: 19, enableFlag: true },
  { planId: 4, actionId: 20, enableFlag: true },
  { planId: 4, actionId: 21, enableFlag: true, limitedUsage: 3 },
  { planId: 4, actionId: 22, enableFlag: true, limitedUsage: 30000 },
  //Why-why
  { planId: 4, actionId: 23, enableFlag: true },
  { planId: 4, actionId: 24, enableFlag: true },
  //Kaizen Hub
  { planId: 4, actionId: 25, enableFlag: true },
  { planId: 4, actionId: 26, enableFlag: true },
];

const detailPlanE = [
  { planId: 5, actionId: 1, enableFlag: true },
  //Parento
  { planId: 5, actionId: 2, enableFlag: true },
  { planId: 5, actionId: 3, enableFlag: true },
  { planId: 5, actionId: 4, enableFlag: true },
  { planId: 5, actionId: 5, enableFlag: true, limitedUsage: 6 },
  { planId: 5, actionId: 6, enableFlag: true },
  { planId: 5, actionId: 7, enableFlag: true },
  { planId: 5, actionId: 8, enableFlag: true },
  //Fishbone
  { planId: 5, actionId: 9, enableFlag: true },
  { planId: 5, actionId: 10, enableFlag: true },
  { planId: 5, actionId: 11, enableFlag: true },
  { planId: 5, actionId: 12, enableFlag: true },
  { planId: 5, actionId: 13, enableFlag: true },
  { planId: 5, actionId: 14, enableFlag: true, limitedUsage: 6 },
  { planId: 5, actionId: 15, enableFlag: true, limitedUsage: 60000 },
  //FTA
  { planId: 5, actionId: 16, enableFlag: true },
  { planId: 5, actionId: 17, enableFlag: true },
  { planId: 5, actionId: 18, enableFlag: true },
  { planId: 5, actionId: 19, enableFlag: true },
  { planId: 5, actionId: 20, enableFlag: true },
  { planId: 5, actionId: 21, enableFlag: true, limitedUsage: 6 },
  { planId: 5, actionId: 22, enableFlag: true, limitedUsage: 60000 },
  //Why-why
  { planId: 5, actionId: 23, enableFlag: true },
  { planId: 5, actionId: 24, enableFlag: true },
  //Kaizen Hub
  { planId: 5, actionId: 25, enableFlag: true },
  { planId: 5, actionId: 26, enableFlag: true },
];

export async function seedPlanDetails() {
  const existingDetails = await prisma.planDetail.findMany();
  if (existingDetails.length > 0) {
    await prisma.$executeRaw`TRUNCATE TABLE "PlanDetail" RESTART IDENTITY CASCADE;`;
  }

  const planDetails = detailPlanA.concat(detailPlanB, detailPlanC, detailPlanD, detailPlanE);

  // Create plan details
  await prisma.planDetail.createMany({ data: planDetails });
}
