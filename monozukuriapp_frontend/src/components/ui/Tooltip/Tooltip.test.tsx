import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import Tooltip from "./Tooltip";

test("Tooltip renders with text", () => {
  const { getByText } = render(<Tooltip text="Tooltip text">Hover over me</Tooltip>);
  expect(getByText("Tooltip text")).toBeInTheDocument();
});
