import React, { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fireEvent } from "@storybook/testing-library";
import CodeForm from "./index";

// Utils
const getElementsCodeForm = (canvasElement: HTMLElement) => {
  const codeInput = canvasElement.querySelector('input[name="code"]') as HTMLInputElement;
  const passwordInput = canvasElement.querySelector('input[name="password"]') as HTMLInputElement;
  const confirmPasswordInput = canvasElement.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
  const form = canvasElement.querySelector("form");
  const submitButton = canvasElement.querySelector('button[type="submit"]');
  const resendButton = canvasElement.querySelector(".text-linkColor");

  return { codeInput, passwordInput, confirmPasswordInput, form, submitButton, resendButton };
};

const CodeFormWrapper = () => {
  return (
    <BrowserRouter>
      <CodeForm />
      <ToastContainer />
    </BrowserRouter>
  );
};

const meta = {
  title: "Auth/VerifyCodeForm",
  component: CodeFormWrapper,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story: ComponentType) => (
      <div style={{ width: "400px", padding: "20px" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof CodeFormWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state
export const Default: Story = {};

// Empty form submission
export const EmptySubmission: Story = {
  play: async ({ canvasElement }) => {
    const { form, submitButton } = getElementsCodeForm(canvasElement);
    if (form && submitButton) {
      fireEvent.click(submitButton);
    }
  },
};

// Invalid code format
export const InvalidCodeFormat: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, form, submitButton } = getElementsCodeForm(canvasElement);
    if (codeInput && form && submitButton) {
      fireEvent.change(codeInput, { target: { value: "123" } });
      fireEvent.click(submitButton);
    }
  },
};

// Invalid password format (too short)
export const InvalidPasswordShort: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, passwordInput, form, submitButton } = getElementsCodeForm(canvasElement);
    if (codeInput && passwordInput && form && submitButton) {
      fireEvent.change(codeInput, { target: { value: "123456" } });
      fireEvent.change(passwordInput, { target: { value: "Short1!" } });
      fireEvent.click(submitButton);
    }
  },
};

// Invalid password format (no lowercase)
export const InvalidPasswordNoLowercase: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, passwordInput, form, submitButton } = getElementsCodeForm(canvasElement);
    if (codeInput && passwordInput && form && submitButton) {
      fireEvent.change(codeInput, { target: { value: "123456" } });
      fireEvent.change(passwordInput, { target: { value: "PASSWORD1!" } });
      fireEvent.click(submitButton);
    }
  },
};

// Invalid password format (no uppercase)
export const InvalidPasswordNoUppercase: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, passwordInput, form, submitButton } = getElementsCodeForm(canvasElement);
    if (codeInput && passwordInput && form && submitButton) {
      fireEvent.change(codeInput, { target: { value: "123456" } });
      fireEvent.change(passwordInput, { target: { value: "password1!" } });
      fireEvent.click(submitButton);
    }
  },
};

// Invalid password format (no number)
export const InvalidPasswordNoNumber: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, passwordInput, form, submitButton } = getElementsCodeForm(canvasElement);
    if (codeInput && passwordInput && form && submitButton) {
      fireEvent.change(codeInput, { target: { value: "123456" } });
      fireEvent.change(passwordInput, { target: { value: "Password!" } });
      fireEvent.click(submitButton);
    }
  },
};

// Invalid password format (no special character)
export const InvalidPasswordNoSpecial: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, passwordInput, form, submitButton } = getElementsCodeForm(canvasElement);
    if (codeInput && passwordInput && form && submitButton) {
      fireEvent.change(codeInput, { target: { value: "123456" } });
      fireEvent.change(passwordInput, { target: { value: "Password1" } });
      fireEvent.click(submitButton);
    }
  },
};

// Password mismatch
export const PasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, passwordInput, confirmPasswordInput, form, submitButton } = getElementsCodeForm(canvasElement);
    if (codeInput && passwordInput && confirmPasswordInput && form && submitButton) {
      fireEvent.change(codeInput, { target: { value: "123456" } });
      fireEvent.change(passwordInput, { target: { value: "Password1!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "DifferentPass1!" } });
      fireEvent.click(submitButton);
    }
  },
};

// Valid submission
export const ValidSubmission: Story = {
  play: async ({ canvasElement }) => {
    const { codeInput, passwordInput, confirmPasswordInput, form, submitButton } = getElementsCodeForm(canvasElement);
    if (codeInput && passwordInput && confirmPasswordInput && form && submitButton) {
      fireEvent.change(codeInput, { target: { value: "123456" } });
      fireEvent.change(passwordInput, { target: { value: "Password1!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password1!" } });
      fireEvent.click(submitButton);
    }
  },
};
