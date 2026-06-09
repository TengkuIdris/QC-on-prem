import React from "react";
import "./Alert.module.css";

interface AlertProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
}

const Alert: React.FC<AlertProps> = ({ message, type = "info" }) => {
  return <div className={`alert alert-${type}`}>{message}</div>;
};

export default Alert;
export type { AlertProps };
