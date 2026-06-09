import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Node {
  id: number;
  name: string;
  level: number;
  children: Node[];
  title?: string;
  fontFamily?: string;
}

export interface TreeState {
  rootNode: Node;
}

const initialState: TreeState = {
  rootNode: { id: 0, name: "Root", level: 0, children: [] },
};

const treeSlice = createSlice({
  name: "tree",
  initialState,
  reducers: {
    setRootNode(state, action: PayloadAction<any>) {
      state.rootNode = action.payload;
    },
  },
});

export const { setRootNode } = treeSlice.actions;
export default treeSlice.reducer;
