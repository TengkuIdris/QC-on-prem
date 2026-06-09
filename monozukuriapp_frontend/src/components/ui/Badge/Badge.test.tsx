import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import Badge from "./Badge";

test("Badge renders with text and color", () => {
  const { getByText } = render(<Badge color="success" />);
  expect(getByText("New")).toBeInTheDocument();
  expect(getByText("New")).toHaveClass("badge-success");
});
