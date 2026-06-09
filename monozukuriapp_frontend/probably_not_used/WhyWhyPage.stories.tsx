import React, { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import WhyWhyPage from "../src/features/whywhy/WhyWhyPage/index";
import { fireEvent, within } from "@storybook/testing-library";

const getElementsWhyWhyPage = (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const chatInput = canvas.getByPlaceholderText("ここに質問や情報を入力してください...");
  const sendButton = canvas.getByText("送信");
  const fileUploadButton = canvas.getByText("クリックして参照してください");
  const downloadButton = canvas.getByText(/テンプレートファイル/);
  return { chatInput, sendButton, fileUploadButton, downloadButton };
};

const meta = {
  title: "Features/WhyWhy/WhyWhyPage",
  component: WhyWhyPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: ComponentType) => (
      <div style={{ height: "100vh", backgroundColor: "#f5f5f5" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof WhyWhyPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithChatInteraction: Story = {
  play: async ({ canvasElement }) => {
    const { chatInput, sendButton } = getElementsWhyWhyPage(canvasElement);
    await fireEvent.change(chatInput, { target: { value: "Test message" } });
    await fireEvent.click(sendButton);
  },
};

export const WithFileUpload: Story = {
  play: async ({ canvasElement }) => {
    const fileInput = within(canvasElement).getByTestId("file-upload-input");
    const file = new File(["test content"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await fireEvent.change(fileInput, {
      target: { files: [file] },
    });
  },
};

export const WithDragAndDrop: Story = {
  play: async ({ canvasElement }) => {
    const dropZone = within(canvasElement)
      .getByText(/ドキュメントをここにドラッグア/)
      .closest("div");
    const file = new File(["test content"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await fireEvent.dragOver(dropZone!);
    await fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });
  },
};

export const WithLongChatHistory: Story = {
  args: {
    initialMessages: [
      { type: "left", message: "こんにちは!何かお困りですか?" },
      { type: "right", message: "なぜなぜ分析を行いたいです!" },
      { type: "left", message: "情報をアップロードして、詳細を教えてくださ い。" },
      { type: "right", message: "はい、承知しました。" },
      { type: "left", message: "ファイルを確認しました。" },
      { type: "right", message: "ありがとうございます。" },
    ],
  },
};

export const WithFileUploadError: Story = {
  play: async ({ canvasElement }) => {
    const fileInput = within(canvasElement).getByTestId("file-upload-input");
    const file = new File(["test content"], "test.txt", {
      type: "text/plain",
    });

    await fireEvent.change(fileInput, {
      target: { files: [file] },
    });
  },
};

export const WithLoadingState: Story = {
  parameters: {
    mockData: {
      loading: true,
    },
  },
};

export const WithErrorState: Story = {
  parameters: {
    mockData: {
      error: "エラーが発生しました。",
    },
  },
};
