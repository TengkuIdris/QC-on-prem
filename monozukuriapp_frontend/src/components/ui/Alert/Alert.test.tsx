import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import Alert from "./Alert";

test("Alert renders with message and type", () => {
  const { getByText } = render(
    <Alert
      message="This is an info alert"
      type="info"
    />,
  );
  expect(getByText("This is an info alert")).toBeInTheDocument();
  expect(getByText("This is an info alert")).toHaveClass("alert-info");
});
