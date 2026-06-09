import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FileState {
  content: string | null;
}

const initialState: FileState = {
  content: null,
};

const fileSlice = createSlice({
  name: "file",
  initialState,
  reducers: {
    setFileContent(state, action: PayloadAction<string>) {
      state.content = action.payload;
    },
  },
});

export const { setFileContent } = fileSlice.actions;
export default fileSlice.reducer;
