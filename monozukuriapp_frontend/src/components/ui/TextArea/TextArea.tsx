import React, { DetailedHTMLProps, FC } from "react";

const TextArea: FC<DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>> = (
  props,
) => {
  return <textarea {...props} />;
};

export default TextArea;
