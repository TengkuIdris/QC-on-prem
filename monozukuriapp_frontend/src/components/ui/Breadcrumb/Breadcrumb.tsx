import React from "react";
import { Link } from "react-router-dom";
import "./Breadcrumb.module.css";

interface BreadcrumbProps {
  items: { text: string; href?: string }[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="breadcrumb">
      {items.map((item, index) => (
        <span key={index}>
          {item.href ? <Link to={item.href}>{item.text}</Link> : item.text}
          {index < items.length - 1 && " / "}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumb;
export type { BreadcrumbProps };
