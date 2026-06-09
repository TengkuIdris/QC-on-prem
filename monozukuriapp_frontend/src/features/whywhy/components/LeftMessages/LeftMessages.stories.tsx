import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import LeftMessages from "./index";

const meta = {
  title: "Features/WhyWhy/LeftMessages",
  component: LeftMessages,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "600px", padding: "20px", backgroundColor: "#f5f5f5" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof LeftMessages>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    messages: "こんにちは!何かお困りですか?",
  },
};

export const LongMessage: Story = {
  args: {
    messages: "これは長いメッセージです。メッセージの長さをテストするために、このように長いテキストを使用しています。",
  },
};

export const WithEmoji: Story = {
  args: {
    messages: "こんにちは! 👋 お元気ですか? 😊",
  },
};

export const MultipleLines: Story = {
  args: {
    messages: "1行目\n2行目\n3行目",
  },
};
