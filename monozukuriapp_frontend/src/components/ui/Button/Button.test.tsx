import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Button from "./Button";

test("Button renders with text", () => {
  const { getByText } = render(
    <Button
      children="Click me"
      onClick={() => {}}
    />,
  );
  expect(getByText("Click me")).toBeInTheDocument();
});

test("Button calls onClick when clicked", () => {
  const handleClick = jest.fn();
  const { getByText } = render(<Button onClick={handleClick} />);
  fireEvent.click(getByText("Click me"));
  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("Button can be disabled", () => {
  const handleClick = jest.fn();
  const { getByText } = render(
    <Button
      children="Click me"
      onClick={handleClick}
      disabled
    />,
  );
  fireEvent.click(getByText("Click me"));
  expect(handleClick).not.toHaveBeenCalled();
});
