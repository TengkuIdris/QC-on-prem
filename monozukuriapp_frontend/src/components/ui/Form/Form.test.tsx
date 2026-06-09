import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Form from "./Form";

test("Form submits with correct data", () => {
  const handleSubmit = jest.fn();
  const { getByPlaceholderText, getByText } = render(<Form onSubmit={handleSubmit} />);

  fireEvent.change(getByPlaceholderText("Name"), { target: { value: "John Doe" } });
  fireEvent.change(getByPlaceholderText("Email"), { target: { value: "john@example.com" } });
  fireEvent.click(getByText("Submit"));

  expect(handleSubmit).toHaveBeenCalledWith({ name: "John Doe", email: "john@example.com" });
});
