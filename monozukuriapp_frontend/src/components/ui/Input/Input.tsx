import React from "react";
import "./Input.module.css";

const Input: React.FC<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>> = (
  props,
) => {
  return <input {...props} />;
};

export default Input;
