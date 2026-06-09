import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RightMessages from "./index";

describe("RightMessages Component", () => {
  test("renders message correctly", () => {
    const message = "Test message";
    render(<RightMessages messages={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  test("applies correct styling", () => {
    const message = "Test message";
    render(<RightMessages messages={message} />);

    const messageElement = screen.getByText(message);
    expect(messageElement).toHaveStyle({
      display: "inline-block",
      maxWidth: "70%",
      color: "white",
    });

    const container = messageElement.parentElement;
    expect(container).toHaveStyle({
      textAlign: "end",
    });
  });

  test("handles long messages", () => {
    const longMessage = "A".repeat(100);
    render(<RightMessages messages={longMessage} />);
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });
});
