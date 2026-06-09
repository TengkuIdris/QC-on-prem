import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Modal from "./Modal";

test("Modal renders when isOpen is true", () => {
  const { getByText } = render(
    <Modal
      isOpen={true}
      onClose={() => {}}
      title="Modal Title"
    >
      Content
    </Modal>,
  );
  expect(getByText("Modal Title")).toBeInTheDocument();
  expect(getByText("Content")).toBeInTheDocument();
});

test("Modal does not render when isOpen is false", () => {
  const { queryByText } = render(
    <Modal
      isOpen={false}
      onClose={() => {}}
      title="Modal Title"
    >
      Content
    </Modal>,
  );
  expect(queryByText("Modal Title")).not.toBeInTheDocument();
  expect(queryByText("Content")).not.toBeInTheDocument();
});

test("Modal calls onClose when close button is clicked", () => {
  const handleClose = jest.fn();
  const { getByText } = render(
    <Modal
      isOpen={true}
      onClose={handleClose}
      title="Modal Title"
    >
      Content
    </Modal>,
  );
  fireEvent.click(getByText("×"));
  expect(handleClose).toHaveBeenCalledTimes(1);
});
