import React from "react";
import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps } from "@mui/material";

interface TextFieldProps extends Omit<MuiTextFieldProps, "label"> {
  label: string;
}

const TextField: React.FC<TextFieldProps> = ({ label, ...props }) => {
  return (
    <MuiTextField
      label={label}
      {...props}
    />
  );
};

export default TextField;
