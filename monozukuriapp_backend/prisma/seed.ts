import { seedActions } from "./seeds/action.seed";
import { seedCategories } from "./seeds/category.seed";
import { seedPlans } from "./seeds/plan.seed";
import { seedPlanDetails } from "./seeds/planDetail.seed";

async function main() {
  try {
    console.log("Starting seed process...");

    await seedActions(); // Seed Action table
    await seedPlans(); // Seed Plan table
    await seedPlanDetails(); // Seed PlanDetail table
    await seedCategories(); // Seed Categories table

    console.log("Seed process completed.");
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
