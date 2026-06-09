import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SubmitState {
  isSubmitted: boolean;
}

const initialState: SubmitState = {
  isSubmitted: false,
};

const submitSlice = createSlice({
  name: "submit",
  initialState,
  reducers: {
    setSubmitStatus: (state, action: PayloadAction<boolean>) => {
      state.isSubmitted = action.payload;
    },
    resetSubmitStatus: (state) => {
      state.isSubmitted = false;
    },
  },
});

export const { setSubmitStatus, resetSubmitStatus } = submitSlice.actions;

export default submitSlice.reducer;
