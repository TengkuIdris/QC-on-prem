import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isOpenSidebar: true,
};

const nodeFishboneSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isOpenSidebar = !state.isOpenSidebar;
    },
    openSidebar: (state) => {
      state.isOpenSidebar = true;
    },
    closeSidebar: (state) => {
      state.isOpenSidebar = false;
    },
  },
});

export const { toggleSidebar, openSidebar, closeSidebar } = nodeFishboneSlice.actions;
export default nodeFishboneSlice.reducer;
