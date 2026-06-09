import React from "react";
import "./Avatar.module.css";

const Avatar: React.FC<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>> = ({
  src = "default-avatar.png",
  alt = "Avatar",
  className = "",
  ...props
}) => {
  return (
    <img
      className={`${className} rounded-full`}
      src={src}
      alt={alt}
      {...props}
    />
  );
};

export default Avatar;
