import React from "react";

const Label: React.FC<React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>> = ({
  className = "",
  ...props
}) => {
  return (
    <label
      className={`${className} font-bold text-sm mb-1 block`}
      {...props}
    />
  );
};

export default Label;
