import { ActionEnum, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedActions() {
  // Check if there are existing plans
  const existingActions = await prisma.action.findMany();

  if (existingActions.length > 0) {
    // Truncate the table and reset identity
    await prisma.$executeRaw`TRUNCATE TABLE "Action" RESTART IDENTITY CASCADE;`;
  }

  const actions = [
    { type: ActionEnum.LANDING_PAGE, name: "ランディングページ閲覧" },
    { type: ActionEnum.PARENTO_CREATE_PAGE, name: "作成ページ" },
    { type: ActionEnum.PARENTO_SAVE_AS_CSV, name: "CSV保存" },
    { type: ActionEnum.PARENTO_DOWNLOAD_IMAGE, name: "画像ダウンロード" },
    { type: ActionEnum.PARENTO_SAVE_TYPED_DATA, name: "入力データWEB保存" },
    { type: ActionEnum.PARENTO_CHOOSE_FONT_TEXT, name: "フォント選択" },
    { type: ActionEnum.PARENTO_CHOOSE_SIZE_TEXT, name: "フォントサイズ選択" },
    { type: ActionEnum.PARENTO_CHOOSE_COLOR_TEXT, name: "フォントカラー選択" },
    { type: ActionEnum.FISHBONE_CREATE_PAGE, name: "作成ページ" },
    { type: ActionEnum.FISHBONE_SAVE_AS_CSV, name: "CSV保存" },
    { type: ActionEnum.FISHBONE_DOWNLOAD_IMAGE, name: "画像ダウンロード" },
    { type: ActionEnum.FISHBONE_CHOOSE_FONT_TEXT, name: "フォント選択" },
    { type: ActionEnum.FISHBONE_CHOOSE_FONT_SIZE, name: "フォントサイズ選択" },
    { type: ActionEnum.FISHBONE_SAVE_TYPED_DATA, name: "入力データWEB保存" },
    { type: ActionEnum.FISHBONE_AI_TEST, name: "AIアシスト" },
    { type: ActionEnum.FTA_CREATE_PAGE, name: "作成ページ" },
    { type: ActionEnum.FTA_SAVE_AS_CSV, name: "CSV保存" },
    { type: ActionEnum.FTA_DOWNLOAD_IMAGE, name: "画像ダウンロード" },
    { type: ActionEnum.FTA_CHOOSE_FONT_TEXT, name: "フォント選択" },
    { type: ActionEnum.FTA_CHOOSE_FONT_SIZE, name: "フォントサイズ選択" },
    { type: ActionEnum.FTA_SAVE_TYPED_DATA, name: "入力データWEB保存" },
    { type: ActionEnum.FTA_AI_TEST, name: "AIアシスト" },
    { type: ActionEnum.WHYWHY_CREATE_PAGE, name: "作成ページ" },
    { type: ActionEnum.WHYWHY_DOWNLOAD_TEMPLATE_FILE, name: "テンプレートファイルのダウンロード" },
    { type: ActionEnum.KAIZENHUB_MAIN_SCREEN, name: "ホーム画面の閲覧" },
    { type: ActionEnum.KAIZENHUB_POST_AND_VIEW, name: "レシピ投稿・閲覧機能" },
  ];

  // Create plans
  await prisma.action.createMany({ data: actions });
}
