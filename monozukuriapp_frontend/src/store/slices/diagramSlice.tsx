import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Bone, DiagramState } from "../../features/diagram/types/index";

const initialState: DiagramState = {
  characteristic: "",
  largeBones: [],
  mediumBones: [],
  smallBones: [],
  data: 0,
  loading: false,
  error: null,
};

const diagramSlice = createSlice({
  name: "diagram",
  initialState,
  reducers: {
    updateCharacteristic: (state, action: PayloadAction<string>) => {
      state.characteristic = action.payload;
    },
    addLargeBone: (state, action: PayloadAction<Bone>) => {
      if (state.largeBones.length < 7) {
        state.largeBones.push(action.payload);
      }
    },
    removeLargeBone: (state, action: PayloadAction<number>) => {
      state.largeBones.splice(action.payload, 1);
    },
    addMediumBone: (state, action: PayloadAction<{ parentIndex: number; bone: Bone }>) => {
      const { parentIndex, bone } = action.payload;
      if (!state.mediumBones[parentIndex]) {
        state.mediumBones[parentIndex] = [];
      }
      state.mediumBones[parentIndex].push(bone);
    },
    addSmallBone: (state, action: PayloadAction<{ parentIndex: number; grandParentIndex: number; bone: Bone }>) => {
      const { parentIndex, grandParentIndex, bone } = action.payload;
      if (!state.smallBones[grandParentIndex]) {
        state.smallBones[grandParentIndex] = [];
      }
      if (!state.smallBones[grandParentIndex][parentIndex]) {
        state.smallBones[grandParentIndex][parentIndex] = [];
      }
      state.smallBones[grandParentIndex][parentIndex].push(bone);
    },
    clearDiagram: (state) => {
      return initialState;
    },
    updateDiagram: (state, action: PayloadAction<DiagramState>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  updateCharacteristic,
  addLargeBone,
  removeLargeBone,
  addMediumBone,
  addSmallBone,
  clearDiagram,
  updateDiagram,
} = diagramSlice.actions;

export default diagramSlice.reducer;
