import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { prismaClient } from "prisma/client/instance";
import { httpErrors } from "src/exceptions/index.exceptions";
import { ActionEnum } from "@prisma/client";

@Injectable()
export class UserService {
  async getMe(id: number) {
    const userWithPlans = await prismaClient.user.findUnique({
      where: {
        id,
      },
      include: {
        userPlans: {
          include: {
            plan: true,
          },
          where: {
            isActive: true, // Active user plans
            plan: {
              isActive: true, // Plans must be active
            },
          },
        },
        company_relation: true,
      },
    });
    if (!userWithPlans.is_active) {
      throw new HttpException(httpErrors.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    if (!userWithPlans || userWithPlans.user_type !== "Member") {
      throw new HttpException(httpErrors.USER_NOT_EXISTED, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!userWithPlans.userPlans || userWithPlans.userPlans.length === 0) {
      // const detailPlanB = await prismaClient.planDetail.findMany({
      //   where: {
      //     plan: {
      //       type: PlanTypeEnum.PLAN_B,
      //       isActive: true,
      //     },
      //   },
      //   include: {
      //     action: true,
      //   },
      // });

      //change to plan D to UET temporarily
      const detailPlanD = await prismaClient.planDetail.findMany({
        where: {
          plan: {
            type: "PLAN_D",
            isActive: true,
          },
        },
        include: {
          action: true,
        },
      });

      return {
        ...userWithPlans,
        userPlans: undefined,
        plansDetails: detailPlanD,
      };
    }

    const plan = userWithPlans.userPlans[0].plan;
    const fishboneAiTestThisMonth = await prismaClient.fishBoneAssistant.count({
      where: {
        userId: id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      },
    });

    const actionConfigs = [
      { type: ActionEnum.LANDING_PAGE, name: "LANDING_PAGE", enableFlag: true },
      { type: ActionEnum.PARENTO_CREATE_PAGE, name: "PARENTO_CREATE_PAGE", enableFlag: plan.parento },
      { type: ActionEnum.PARENTO_DOWNLOAD_IMAGE, name: "PARENTO_DOWNLOAD_IMAGE", enableFlag: plan.parento },
      { type: ActionEnum.FISHBONE_DOWNLOAD_IMAGE, name: "FISHBONE_DOWNLOAD_IMAGE", enableFlag: plan.fishbone },
      { type: ActionEnum.PARENTO_SAVE_AS_CSV, name: "PARENTO_SAVE_AS_CSV", enableFlag: plan.parento },
      { type: ActionEnum.PARENTO_SAVE_TYPED_DATA, name: "PARENTO_SAVE_TYPED_DATA", enableFlag: plan.parento },
      { type: ActionEnum.PARENTO_CHOOSE_FONT_TEXT, name: "PARENTO_CHOOSE_FONT_TEXT", enableFlag: plan.parento },
      { type: ActionEnum.PARENTO_CHOOSE_COLOR_TEXT, name: "PARENTO_CHOOSE_COLOR_TEXT", enableFlag: plan.parento },
      { type: ActionEnum.FISHBONE_CREATE_PAGE, name: "FISHBONE_CREATE_PAGE", enableFlag: plan.fishbone },
      { type: ActionEnum.FISHBONE_SAVE_AS_CSV, name: "FISHBONE_SAVE_AS_CSV", enableFlag: plan.fishbone },
      { type: ActionEnum.FISHBONE_SAVE_TYPED_DATA, name: "FISHBONE_SAVE_TYPED_DATA", enableFlag: plan.fishbone },
      {
        type: ActionEnum.FISHBONE_AI_TEST,
        name: "FISHBONE_AI_TEST",
        enableFlag: plan.fishbone && fishboneAiTestThisMonth <= plan.api_call_limit,
      },
      { type: ActionEnum.FTA_CREATE_PAGE, name: "FTA_CREATE_PAGE", enableFlag: true },
      { type: ActionEnum.FTA_SAVE_AS_CSV, name: "FTA_SAVE_AS_CSV", enableFlag: true },
      { type: ActionEnum.FTA_SAVE_TYPED_DATA, name: "FTA_SAVE_TYPED_DATA", enableFlag: true },
      { type: ActionEnum.FTA_AI_TEST, name: "FTA_AI_TEST", enableFlag: true },
      { type: ActionEnum.WHYWHY_CREATE_PAGE, name: "WHYWHY_CREATE_PAGE", enableFlag: plan.whywhy },
      {
        type: ActionEnum.WHYWHY_DOWNLOAD_TEMPLATE_FILE,
        name: "WHYWHY_DOWNLOAD_TEMPLATE_FILE",
        enableFlag: plan.whywhy,
      },
      { type: ActionEnum.KAIZENHUB_MAIN_SCREEN, name: "KAIZENHUB_MAIN_SCREEN", enableFlag: plan.kaizenhub_main_screen },
      {
        type: ActionEnum.KAIZENHUB_POST_AND_VIEW,
        name: "KAIZENHUB_POST_AND_VIEW",
        enableFlag: plan.kaizenhub_post_and_view,
      },
      { type: ActionEnum.FISHBONE_CHOOSE_FONT_TEXT, name: "FISHBONE_CHOOSE_FONT_TEXT", enableFlag: plan.fishbone },
      { type: ActionEnum.FISHBONE_CHOOSE_FONT_SIZE, name: "FISHBONE_CHOOSE_FONT_SIZE", enableFlag: plan.fishbone },
      { type: ActionEnum.FTA_DOWNLOAD_IMAGE, name: "FTA_DOWNLOAD_IMAGE", enableFlag: true },
      { type: ActionEnum.FTA_CHOOSE_FONT_TEXT, name: "FTA_CHOOSE_FONT_TEXT", enableFlag: true },
      { type: ActionEnum.FTA_CHOOSE_FONT_SIZE, name: "FTA_CHOOSE_FONT_SIZE", enableFlag: true },
    ];

    const result = {
      ...userWithPlans,
      userPlans: undefined,
      plansDetails: actionConfigs.map((config) => ({
        action: {
          type: config.type,
          name: config.name,
        },
        enableFlag: config.enableFlag,
        limitedUsage: plan.usage_limit_mb,
      })),
    };

    return result;
  }

  async getLimitedRecordsInPlan(userId: number, actionName: ActionEnum) {
    const user = await this.getMe(userId);
    const planDetail = user.plansDetails.find((plan) => plan.action.type === actionName);
    if (!planDetail || !planDetail?.enableFlag) {
      throw new HttpException(httpErrors.NOT_ALLOWED_TO_SAVE_DATA, HttpStatus.FORBIDDEN);
    }
    return planDetail.limitedUsage;
  }
}
