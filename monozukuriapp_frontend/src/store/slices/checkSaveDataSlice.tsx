import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SaveData {
  pareto: boolean;
  fishbone: boolean;
}

const initialState: SaveData = {
  pareto: false,
  fishbone: false,
};

const checkSaveDataSlice = createSlice({
  name: "checkSaveData",
  initialState,
  reducers: {
    setSavePareto: (state, action: PayloadAction<any>) => {
      state.pareto = action.payload.pareto;
    },
    setSaveFishBone: (state, action: PayloadAction<any>) => {
      state.fishbone = action.payload.fishbone;
    },
    clearSavePareto: (state, action: PayloadAction<any>) => {
      state.pareto = action.payload.pareto;
      state.fishbone = false;
    },
    clearSaveFishBone: (state) => {
      state.fishbone = false;
    },
  },
});

export const { setSavePareto, setSaveFishBone, clearSavePareto, clearSaveFishBone } = checkSaveDataSlice.actions;
export default checkSaveDataSlice.reducer;
