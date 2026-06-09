import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import MessageItem, { Sender } from "./index";
import event from "@/utils/eventEmitter";
import { EventChatType } from "@/constant/enum";
import * as timeUtils from "../utils/formatTime";

// Mock event emitter
jest.mock("@/utils/eventEmitter", () => ({
  emit: jest.fn(),
}));

// Mock formatTimeToNow
jest.spyOn(timeUtils, "formatTimeToNow").mockImplementation(() => "5分前");

describe("MessageItem Component", () => {
  const defaultProps = {
    problem: "Test message",
    senderType: Sender.USER,
    createdAt: new Date("2024-01-01"),
    diagrams: null,
    loadingMessageAi: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders user message correctly", () => {
    render(<MessageItem {...defaultProps} />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
    expect(screen.getByText("AD")).toBeInTheDocument();
  });

  test("renders AI message correctly", () => {
    render(
      <MessageItem
        {...defaultProps}
        senderType={Sender.ASSISTANT}
        diagrams="AI response"
      />,
    );
    expect(screen.getByText("AI response")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  test("renders error message when AI has no diagrams", () => {
    render(
      <MessageItem
        {...defaultProps}
        senderType={Sender.ASSISTANT}
        diagrams={null}
      />,
    );
    expect(screen.getByText("ネットワーク接続が失われました。もう一度実行してください。")).toBeInTheDocument();
  });

  test("shows timestamp when clicked", () => {
    render(<MessageItem {...defaultProps} />);

    const messageContainer = screen.getByText("Test message").parentElement?.parentElement;
    fireEvent.click(messageContainer!);

    expect(screen.getByText("5分前")).toBeInTheDocument();
  });

  test("toggles timestamp visibility on click", () => {
    render(<MessageItem {...defaultProps} />);

    const messageContainer = screen.getByText("Test message").parentElement?.parentElement;

    // First click - show timestamp
    fireEvent.click(messageContainer!);
    const timestamp = screen.getByText("5分前");
    expect(timestamp).toBeInTheDocument();

    // Second click - hide timestamp
    fireEvent.click(messageContainer!);
    expect(screen.queryByText("5分前")).not.toBeInTheDocument();
  });

  test("renders generate chart button for AI messages with diagrams", () => {
    const responseDiagram = "diagram data";
    render(
      <MessageItem
        {...defaultProps}
        senderType={Sender.ASSISTANT}
        diagrams="AI response"
        responseDiagram={responseDiagram}
      />,
    );

    const generateButton = screen.getByText("特性要因図に反映");
    expect(generateButton).toBeInTheDocument();

    fireEvent.click(generateButton);
    expect(event.emit).toHaveBeenCalledWith(EventChatType.GENERATE_CHART, responseDiagram);
  });

  test("applies correct styles based on sender type", () => {
    const { container, rerender } = render(<MessageItem {...defaultProps} />);

    // User message
    const userMessage = container.firstChild;
    expect(userMessage).toHaveClass("flex", "flex-row-reverse");

    const userAvatar = screen.getByTestId("avatar-container");
    const userAvatarInner = screen.getByTestId("avatar-inner");
    expect(userAvatarInner).toHaveClass("bg-[#F4ABB4]");
    expect(userAvatar).toHaveTextContent("AD");

    // AI message
    rerender(
      <MessageItem
        {...defaultProps}
        senderType={Sender.ASSISTANT}
      />,
    );

    const aiMessage = container.firstChild;
    expect(aiMessage).toHaveClass("flex", "left");

    const aiAvatarInner = screen.getByTestId("avatar-inner");
    expect(aiAvatarInner).toHaveClass("bg-[#C8D4DB]");
    expect(screen.getByTestId("avatar-container")).toHaveTextContent("AI");
  });

  test("handles null createdAt", () => {
    render(
      <MessageItem
        {...defaultProps}
        createdAt={null}
      />,
    );

    const messageContainer = screen.getByText("Test message").parentElement?.parentElement;
    fireEvent.click(messageContainer!);

    // Should not show timestamp
    expect(screen.queryByText(/分前/)).not.toBeInTheDocument();
  });
});
