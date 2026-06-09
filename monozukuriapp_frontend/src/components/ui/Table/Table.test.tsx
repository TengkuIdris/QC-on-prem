import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Table from "./Table";

const data = [
  { name: "John Doe", email: "john@example.com" },
  { name: "Jane Smith", email: "jane@example.com" },
];

test("Table renders with data", () => {
  const { getByText } = render(<Table data={data} />);
  expect(getByText("John Doe")).toBeInTheDocument();
  expect(getByText("john@example.com")).toBeInTheDocument();
  expect(getByText("Jane Smith")).toBeInTheDocument();
  expect(getByText("jane@example.com")).toBeInTheDocument();
});
