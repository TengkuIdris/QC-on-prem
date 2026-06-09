import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Input from "./Input";

test("Input renders with value", () => {
  const { getByDisplayValue } = render(
    <Input
      value="Test"
      onChange={() => {}}
    />,
  );
  expect(getByDisplayValue("Test")).toBeInTheDocument();
});

test("Input calls onChange when changed", () => {
  const handleChange = jest.fn();
  const { getByDisplayValue } = render(
    <Input
      value="Test"
      onChange={handleChange}
    />,
  );
  fireEvent.change(getByDisplayValue("Test"), { target: { value: "Changed" } });
  expect(handleChange).toHaveBeenCalledTimes(1);
});

test("Input can be disabled", () => {
  const handleChange = jest.fn();
  const { getByDisplayValue } = render(
    <Input
      value="Test"
      onChange={handleChange}
      disabled
    />,
  );
  fireEvent.change(getByDisplayValue("Test"), { target: { value: "Changed" } });
  expect(handleChange).not.toHaveBeenCalled();
});
