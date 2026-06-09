import React, { createContext, useState } from "react";

const initialState: {
  userHasAction: boolean;
  handleUserAdjust: (value: boolean) => void | undefined;
} = {
  userHasAction: false,
  handleUserAdjust: () => {},
};

export const AdjustFontSizeContext = createContext(initialState);

const FontSizeContext: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>> = (props) => {
  const [userHasAction, setUserHasAction] = useState<boolean>(false);
  const handleUserAdjust = (value: boolean) => {
    setUserHasAction(value);
  };

  return (
    <AdjustFontSizeContext.Provider
      value={{
        userHasAction,
        handleUserAdjust,
      }}
    >
      {props.children}
    </AdjustFontSizeContext.Provider>
  );
};

export { FontSizeContext };
