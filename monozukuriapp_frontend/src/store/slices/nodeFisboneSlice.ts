import { Message } from "@/services/apis/chatService";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: {
  payload: Message;
  isLoading: boolean;
} = {
  isLoading: false,
  payload: {
    diagrams: "",
    numberNode: 0,
    problem: "",
    fishBoneId: 0,
    lang: "en",
  },
};

const nodeFishboneSlice = createSlice({
  initialState,
  name: "nodeFishbone",
  reducers: {
    setNodeFishbone: (state, action: PayloadAction<Message>) => {
      return {
        ...state,
        payload: action.payload,
      };
    },

    setLoadingNodeFishbone: (state, action: PayloadAction<boolean>) => {
      return {
        ...state,
        isLoading: action.payload,
      };
    },

    setLanguageNodeFishbone: (state, action: PayloadAction<string>) => {
      return {
        ...state,
        payload: { ...state.payload, language: action.payload },
      };
    },
  },
});

export const { setNodeFishbone, setLoadingNodeFishbone, setLanguageNodeFishbone } = nodeFishboneSlice.actions;
export default nodeFishboneSlice.reducer;
