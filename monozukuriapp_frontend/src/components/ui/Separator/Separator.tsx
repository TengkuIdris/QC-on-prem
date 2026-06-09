import React from "react";

const Separator: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>> = ({
  className = "",
  ...props
}) => {
  return (
    <div
      className={`${className} w-full border-t border-solid border-gray-300`}
      {...props}
    />
  );
};

export default Separator;
