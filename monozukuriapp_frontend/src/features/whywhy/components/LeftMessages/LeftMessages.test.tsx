import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import LeftMessages from "./index";

describe("LeftMessages Component", () => {
  test("renders message correctly", () => {
    const message = "Test message";
    render(<LeftMessages messages={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  test("applies correct styling", () => {
    const message = "Test message";
    render(<LeftMessages messages={message} />);

    const messageElement = screen.getByText(message);
    expect(messageElement).toHaveStyle({
      display: "inline-block",
      maxWidth: "70%",
    });

    const container = messageElement.parentElement;
    expect(container).toHaveStyle({
      textAlign: "start",
    });
  });

  test("handles long messages", () => {
    const longMessage = "A".repeat(100);
    render(<LeftMessages messages={longMessage} />);
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });
});
