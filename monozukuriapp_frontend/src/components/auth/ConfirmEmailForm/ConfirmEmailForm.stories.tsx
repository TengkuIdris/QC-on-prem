import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import EmailForm from "./index";
import { fireEvent, within } from "@storybook/testing-library";

const getElementsConfirmEmailForm = (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const emailInput = canvas.getByLabelText("メールアドレス");
  const submitButton = canvas.getByRole("button", { name: "メールへ送信" });
  return { emailInput, submitButton };
};

const meta = {
  title: "Auth/ConfirmEmailForm",
  component: EmailForm,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ width: "400px", padding: "20px", backgroundColor: "white" }}>
          <Story />
          <ToastContainer />
        </div>
      </BrowserRouter>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof EmailForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state
export const Default: Story = {};

// Loading state
export const Loading: Story = {
  play: async ({ canvasElement }) => {
    const { submitButton } = getElementsConfirmEmailForm(canvasElement);
    fireEvent.click(submitButton);
  },
};

// Success state
export const Success: Story = {
  play: async ({ canvasElement }) => {
    const { emailInput, submitButton } = getElementsConfirmEmailForm(canvasElement);
    fireEvent.change(emailInput, {
      target: { value: "test@example.com" },
    });
    fireEvent.click(submitButton);
  },
};

// Error state - Invalid Email
export const InvalidEmail: Story = {
  play: async ({ canvasElement }) => {
    const { emailInput } = getElementsConfirmEmailForm(canvasElement);
    fireEvent.change(emailInput, {
      target: { value: "invalid-email" },
    });
    fireEvent.blur(emailInput);
  },
};

// Error state - User Not Found
export const UserNotFound: Story = {
  play: async ({ canvasElement }) => {
    const { emailInput, submitButton } = getElementsConfirmEmailForm(canvasElement);
    fireEvent.change(emailInput, {
      target: { value: "nonexistent@example.com" },
    });
    fireEvent.click(submitButton);
  },
};

// Error state - Attempt Limit Exceeded
export const AttemptLimitExceeded: Story = {
  play: async ({ canvasElement }) => {
    const { emailInput, submitButton } = getElementsConfirmEmailForm(canvasElement);
    fireEvent.change(emailInput, {
      target: { value: "test@example.com" },
    });
    fireEvent.click(submitButton);
  },
};
