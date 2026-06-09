import React from "react";
import "./Card.module.css";

const Card: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>> = (props) => {
  return <section {...props} />;
};

const CardHeader: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>> = (props) => {
  return <header {...props} />;
};
const CardTitle: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>> = ({
  className = "",
  ...props
}) => {
  return (
    <h1
      className={`${className} text-2xl font-bold`}
      {...props}
    />
  );
};
const CardDescription: React.FC<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>
> = ({ className = "", ...props }) => {
  return (
    <p
      className={`${className} text-base`}
      {...props}
    />
  );
};
const CardContent: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>> = (
  props,
) => {
  return <div {...props} />;
};
const CardFooter: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>> = (props) => {
  return <footer {...props} />;
};

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
