import fishboneService from "@/services/apis/fishboneService";
import { Font, TypeApi } from "../enums";

export const api = {
  [TypeApi.CREATE]: fishboneService.createFishbone,
  [TypeApi.UPDATE]: fishboneService.updateFishbone,
  [TypeApi.GET]: fishboneService.getFishbone,
};

export const FontFamily = {
  [Font.NotoSansJP]: "NotoSansJP",
  [Font.MSGothic]: "MSGothic",
  [Font.Arial]: "Arial",
  [Font.Calibri]: "Calibri",
  [Font["Courier-New"]]: "Courier-New",
  [Font.Georgia]: "Georgia",
  [Font.Helvetica]: "Helvetica",
  [Font.MSMINCHO]: "MSMINCHO",
  [Font.Meiryo]: "Meiryo",
  [Font.Tahoma]: "Tahoma",
  [Font["times-new-roman"]]: "times-new-roman",
  [Font["Trebuchet-MS"]]: "Trebuchet-MS",
  [Font.Verdana]: "Verdana",
  [Font.HiraginoSquareGothic]: "HiraginoSquareGothic",
  [Font.TravelToMingDynasty]: "TravelToMingDynasty",
};
