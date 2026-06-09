import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import WhyWhyPage from "../src/features/whywhy/WhyWhyPage/index";

// Mock các components con
jest.mock("../components/LeftMessages", () => {
  return function MockLeftMessages({ messages }: { messages: string }) {
    return <div data-testid="left-message">{messages}</div>;
  };
});

jest.mock("../components/RightMessages", () => {
  return function MockRightMessages({ messages }: { messages: string }) {
    return <div data-testid="right-message">{messages}</div>;
  };
});

describe("WhyWhyPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders main UI elements", () => {
    render(<WhyWhyPage />);

    expect(screen.getByText("Whywhy 分析チャット")).toBeInTheDocument();
    expect(screen.getByText("ファイルアップロード")).toBeInTheDocument();
  });

  test("renders chat messages", () => {
    render(<WhyWhyPage />);

    expect(screen.getByText("こんにちは!何かお困りですか?")).toBeInTheDocument();
    expect(screen.getByText("なぜなぜ分析を行いたいです!")).toBeInTheDocument();
    expect(screen.getByText("情報をアップロードして、詳細を教えてくださ い。")).toBeInTheDocument();
  });

  test("renders input field and send button", () => {
    render(<WhyWhyPage />);

    expect(screen.getByPlaceholderText("ここに質問や情報を入力してください...")).toBeInTheDocument();
    expect(screen.getByText("送信")).toBeInTheDocument();
  });

  test("renders file upload section", () => {
    render(<WhyWhyPage />);

    expect(screen.getByText(/ドキュメントをここにドラッグア/)).toBeInTheDocument();
    expect(screen.getByText("クリックして参照してください")).toBeInTheDocument();
  });

  test("renders template download button", () => {
    render(<WhyWhyPage />);

    const downloadButton = screen.getByText(/テンプレートファイル/);
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton.closest("a")).toHaveAttribute("href", "/files/whywhytemplate.xlsx");
    expect(downloadButton.closest("a")).toHaveAttribute("download", "なぜなぜ分析のテンプレート.xlsx");
  });

  test("allows file upload through button", () => {
    render(<WhyWhyPage />);

    const fileInput = screen.getByTestId("file-upload-input");
    const file = new File(["test content"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });
  });

  test("allows sending chat messages", () => {
    render(<WhyWhyPage />);

    const input = screen.getByPlaceholderText("ここに質問や情報を入力してください...");
    const sendButton = screen.getByText("送信");

    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.click(sendButton);
  });

  test("renders in responsive layout", () => {
    render(<WhyWhyPage />);

    const chatContainer = screen.getByText("Whywhy 分析チャット").closest("div");
    expect(chatContainer).toHaveStyle({ display: "flex", flexDirection: "column" });

    const uploadContainer = screen.getByText("ファイルアップロード").closest("div");
    expect(uploadContainer).toBeInTheDocument();
  });

  test("handles drag and drop for file upload", () => {
    render(<WhyWhyPage />);

    const dropZone = screen.getByText(/ドキュメントをここにドラッグア/).closest("div");
    const file = new File(["test content"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.dragOver(dropZone!);
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });
  });
});
