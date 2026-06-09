import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Dropdown from "./Dropdown";

test("Dropdown renders with options", () => {
  const options = ["Option 1", "Option 2"];
  const { getByText } = render(
    <Dropdown
      options={options}
      onSelect={() => {}}
    />,
  );
  expect(getByText("Select an option")).toBeInTheDocument();
  expect(getByText("Option 1")).toBeInTheDocument();
  expect(getByText("Option 2")).toBeInTheDocument();
});

test("Dropdown calls onSelect when an option is selected", () => {
  const options = ["Option 1", "Option 2"];
  const handleSelect = jest.fn();
  const { getByText } = render(
    <Dropdown
      options={options}
      onSelect={handleSelect}
    />,
  );

  fireEvent.click(getByText("Option 1"));
  expect(handleSelect).toHaveBeenCalledWith("Option 1");
});
