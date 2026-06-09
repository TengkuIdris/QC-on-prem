import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Formik } from "formik";
import ChatUI from "./index";
import event from "@/utils/eventEmitter";
import { EventChatType } from "@/constant/enum";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// Mock styled components
jest.mock("../../../utils/styledComponents", () => ({
  StyledPaper: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock event emitter
jest.mock("@/utils/eventEmitter", () => ({
  emit: jest.fn(),
}));

// Mock Material UI components
jest.mock("@mui/material", () => ({
  Typography: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TextField: ({ ...props }: any) => <input {...props} />,
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock MessageBox component
jest.mock("../MessageBox", () => {
  return function MockMessageBox() {
    return <div data-testid="message-box" />;
  };
});

const theme = createTheme();

describe("ChatUI Component", () => {
  const defaultProps = {
    setQueryIds: jest.fn(),
    diagrams: "test diagrams",
    open: true,
  };

  const renderWithFormik = (props = defaultProps) => {
    return render(
      <ThemeProvider theme={theme}>
        <Formik
          initialValues={{ title: "", new_message: "" }}
          onSubmit={() => {}}
        >
          <ChatUI {...props} />
        </Formik>
      </ThemeProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders chat title", () => {
    renderWithFormik();
    expect(screen.getByText("AI Assistant Chat")).toBeInTheDocument();
  });

  test("renders message box", () => {
    renderWithFormik();
    expect(screen.getByTestId("message-box")).toBeInTheDocument();
  });

  test("renders input field with placeholder", () => {
    renderWithFormik();
    expect(screen.getByPlaceholderText("メッセージ入力...")).toBeInTheDocument();
  });

  test("renders send button", () => {
    renderWithFormik();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  test("handles sending message", () => {
    renderWithFormik();
    const input = screen.getByPlaceholderText("メッセージ入力...");
    const sendButton = screen.getByRole("button");

    // Type a message
    fireEvent.change(input, { target: { value: "test message" } });

    // Click send button
    fireEvent.click(sendButton);

    // Check if event was emitted
    expect(event.emit).toHaveBeenCalledWith(
      EventChatType.LAST_SNAPSHOT_MESSAGE,
      expect.objectContaining({
        value: "test message",
        diagrams: "test diagrams",
      }),
    );
  });

  test("disables send button after sending message", () => {
    renderWithFormik();
    const sendButton = screen.getByRole("button");

    fireEvent.click(sendButton);
    expect(sendButton).toBeDisabled();
  });

  test("handles scroll to load more messages", () => {
    renderWithFormik();
    const chatBox = screen.getByTestId("message-box").parentElement;

    // Simulate scroll to top
    fireEvent.scroll(chatBox!, { target: { scrollTop: 0 } });

    expect(event.emit).toHaveBeenCalledWith(EventChatType.LOAD_MORE_MESSAGES, expect.any(Number));
  });

  test("renders with correct layout structure", () => {
    renderWithFormik();

    // Check main container classes
    const messageBox = screen.getByTestId("message-box");
    const scrollContainer = messageBox.closest('[data-testid="scroll-container"]');
    expect(scrollContainer).toHaveClass("max-h-[calc(100vh-120px)]", "c_scrollbar_out", "custom-scrollbar");

    // Check message box container
    const messageBoxContainer = messageBox.parentElement;
    expect(messageBoxContainer).toHaveClass("p_chat__tab1", "c_message__scroll", "c_scrollbar", "custom-scrollbar");
  });
});
