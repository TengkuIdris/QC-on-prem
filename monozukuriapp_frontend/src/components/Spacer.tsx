import React from "react";

interface SpacerProps {
  size: number;
  type: "horizontal" | "vertical";
}

export const Spacer = (props: SpacerProps) => {
  const { size, type } = props;
  const className = type === "horizontal" ? `tw-w-${size}` : `tw-h-${size}`;
  return <div className={className} />;
};
