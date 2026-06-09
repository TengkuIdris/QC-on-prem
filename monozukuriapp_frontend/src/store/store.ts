import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import settingsReducer from "./slices/settingsSlice";
import paretoReducer from "./slices/paretoSlice";
import ftaReducer from "./slices/ftaSlice";
import whywhyReducer from "./slices/whywhySlice";
import diagramReducer from "./slices/diagramSlice";
import errorReducer from "./slices/errorSlice";
import fileReducer from "./slices/fileSlice";
import treeReducer from "./slices/treeSlice";
import submitReducer from "./slices/submitSlice";
import fontSettingReducer from "./slices/fontSettingSlice";
import kaiZenHubAuthReducer from "./slices/kaiZenHubAuthSlice";
import checkSaveDataReducer from "./slices/checkSaveDataSlice";
import nodeFishboneReducer from "./slices/nodeFisboneSlice";
import layoutReducer from "./slices/layoutSlice";
import submitRecipeReducer from "./slices/submitRecipeSlice";

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    auth: authReducer,
    pareto: paretoReducer,
    fta: ftaReducer,
    whywhy: whywhyReducer,
    diagram: diagramReducer,
    error: errorReducer,
    file: fileReducer,
    tree: treeReducer,
    submit: submitReducer,
    fontSetting: fontSettingReducer,
    kaiZenHubAuth: kaiZenHubAuthReducer,
    checkSaveDataSlice: checkSaveDataReducer,
    nodeFishbone: nodeFishboneReducer,
    layout: layoutReducer,
    submitRecipe: submitRecipeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
