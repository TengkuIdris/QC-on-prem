import { ReactNode, createContext, useReducer } from "react";
import React from "react";
import { reducer } from "../reducer/dataInput.reducer";

export const SingleModeContext = createContext<any>(null);
const SingleModeProvider = ({ children }: { children: ReactNode }) => {
  const [{ items, error, upload }, dispatchContext] = useReducer(reducer, {
    items: [{ name: "", quantity: 0 }],
    error: null,
    upload: false,
  });

  return (
    <SingleModeContext.Provider value={{ data: { items, error, upload }, dispatchContext }}>
      {children}
    </SingleModeContext.Provider>
  );
};

export default SingleModeProvider;
