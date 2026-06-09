import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MeRes } from "../../services/apis/authService";

export interface AuthState {
  isAuthenticated: boolean;
  user: MeRes;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: {
    email: "",
    id: 0,
    name: "",
    role: undefined,
    company: null,
    department: null,
    full_name: null,
    affiliation: null,
    company_relation: null,
  },
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<MeRes>) => {
      state.isAuthenticated = true;
      state.user.email = action.payload.email;
      state.user.id = action.payload.id;
      state.user.name = action.payload.name;
      state.user.full_name = action.payload.full_name;
      state.user.role = action.payload.role;
      state.user.company = action.payload.company;
      state.user.department = action.payload.department;
      state.user.company_relation = action.payload.company_relation;
      state.user.affiliation = action.payload.affiliation;
    },
    updateUserInfo: (state, action: PayloadAction<{ fullName: string }>) => {
      state.user.full_name = action.payload.fullName;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = { ...initialState.user };
    },
  },
});

export const { login, logout, updateUserInfo } = authSlice.actions;
export default authSlice.reducer;
