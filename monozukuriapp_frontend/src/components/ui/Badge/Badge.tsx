import React from "react";
import "./Badge.module.css";

const Badge: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={`flex items-center ${className}`}
      {...props}
    />
  );
};

export default Badge;
