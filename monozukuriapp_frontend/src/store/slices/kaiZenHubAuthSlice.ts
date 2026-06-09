import { createSlice } from "@reduxjs/toolkit";

export interface KaiZenHubAuthState {
  isAuthenticated: boolean;
}

const initialState: KaiZenHubAuthState = {
  isAuthenticated: true,
};

const kaiZenHubAuthSlice = createSlice({
  name: "kaiZenHubAuth",
  initialState,
  reducers: {
    login: (state) => {
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.isAuthenticated = false;
    },
  },
});

export const { login, logout } = kaiZenHubAuthSlice.actions;
export default kaiZenHubAuthSlice.reducer;
