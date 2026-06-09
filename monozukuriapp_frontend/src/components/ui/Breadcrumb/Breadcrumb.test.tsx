import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import Breadcrumb from "./Breadcrumb";

test("Breadcrumb renders correctly", () => {
  const items = [{ text: "Home", href: "/" }, { text: "Category", href: "/category" }, { text: "Item" }];
  const { getByText } = render(<Breadcrumb items={items} />);
  expect(getByText("Home")).toBeInTheDocument();
  expect(getByText("Category")).toBeInTheDocument();
  expect(getByText("Item")).toBeInTheDocument();
});
