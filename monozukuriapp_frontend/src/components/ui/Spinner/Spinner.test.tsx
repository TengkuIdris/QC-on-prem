import React from "react";
import { render } from "@testing-library/react";
import Spinner from "./Spinner";

test("Spinner renders correctly", () => {
  const { container } = render(<Spinner />);
  expect(container.firstChild).toHaveClass("spinner");
});
