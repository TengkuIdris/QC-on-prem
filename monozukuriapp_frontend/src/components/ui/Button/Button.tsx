import React from "react";
import "./Button.module.css";
import { styled } from "@mui/material/styles";
import MuiButton, { ButtonProps } from "@mui/material/Button";

const Button: React.FC<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>> = ({
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={`${className} outline-none focus:outline-none ${disabled && "!bg-white !text-gray-400 !btn-shadow"}`}
      {...props}
    />
  );
};

export const CustomButton = styled(MuiButton)<ButtonProps>({
  border: "1px solid #000",
  backgroundColor: "#fff",
  color: "#000",
  padding: "8px 20px",
  fontSize: "16px",
  "&:hover": {
    backgroundColor: "#000",
    color: "#fff",
    border: "1px solid #000",
  },
});

export default Button;
