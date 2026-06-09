import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type FontType =
  | "Osaka"
  | "MS Gothic"
  | "IPAexGothic"
  | "IPAexMincho"
  | "NotoSansJP-Regular"
  | "BIZUDPGothic-Regular";
export type FontSizeType = 8 | 10 | 12 | 14 | 16 | 20 | 24 | 28 | 32;

interface FontSettingState {
  fontType: FontType;
  fontSize: FontSizeType;
}

const initialState: FontSettingState = {
  fontType: "BIZUDPGothic-Regular",
  fontSize: 16,
};

const fontSettingSlice = createSlice({
  name: "fontSetting",
  initialState,
  reducers: {
    handleUpdateFontType(state, action: PayloadAction<FontType>) {
      state.fontType = action.payload;
    },
    handleUpdateFontSize(state, action: PayloadAction<FontSizeType>) {
      state.fontSize = action.payload;
    },
  },
});

export const { handleUpdateFontType, handleUpdateFontSize } = fontSettingSlice.actions;
export default fontSettingSlice.reducer;

export const parseFontType = (font: string): FontType => font as FontType;
export const parseFontSize = (fontSize: string): FontSizeType => parseInt(fontSize) as FontSizeType;
