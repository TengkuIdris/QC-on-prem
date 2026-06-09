import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import SignUpVerifyForm from "./index";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { within, userEvent } from "@storybook/testing-library";

// utils
const getElementsVerifyForm = (canvas: HTMLElement) => {
  return {
    codeInput: within(canvas).getByLabelText("検証コード"),
    submitButton: within(canvas).getByRole("button", { name: "確認する" }),
    resendButton: within(canvas).getByText("コードを再送信する"),
  };
};

const meta: Meta<typeof SignUpVerifyForm> = {
  title: "Auth/VerifySignUpForm",
  component: SignUpVerifyForm,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ width: "400px", padding: "20px" }}>
          <Story />
          <ToastContainer />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SignUpVerifyForm>;

// Default state
export const Default: Story = {};

// Empty form submission
export const EmptySubmission: Story = {
  play: async ({ canvasElement }) => {
    const { submitButton } = getElementsVerifyForm(canvasElement);
    await userEvent.click(submitButton);
  },
};

// Invalid code format (less than 6 digits)
export const InvalidCodeFormat: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, submitButton } = getElementsVerifyForm(canvasElement);
    await userEvent.type(codeInput, "123");
    await userEvent.click(submitButton);
  },
};

// Non-numeric code
export const NonNumericCode: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, submitButton } = getElementsVerifyForm(canvasElement);
    await userEvent.type(codeInput, "abc123");
    await userEvent.click(submitButton);
  },
};
