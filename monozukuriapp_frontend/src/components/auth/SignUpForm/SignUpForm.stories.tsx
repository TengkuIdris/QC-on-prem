import React, { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import SignUpForm from "./index";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fireEvent } from "@storybook/testing-library";

// utils
const getElementsSignUpForm = (canvasElement: HTMLElement) => {
  const usernameInput = canvasElement.querySelector('input[name="username"]') as HTMLInputElement;
  const emailInput = canvasElement.querySelector('input[name="email"]') as HTMLInputElement;
  const passwordInput = canvasElement.querySelector('input[name="password"]') as HTMLInputElement;
  const confirmPasswordInput = canvasElement.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
  const form = canvasElement.querySelector("form");
  const submitButton = canvasElement.querySelector('button[type="submit"]');

  return { usernameInput, emailInput, passwordInput, confirmPasswordInput, form, submitButton };
};

const SignUpFormWrapper = () => {
  return (
    <BrowserRouter>
      <SignUpForm />
      <ToastContainer />
    </BrowserRouter>
  );
};

const meta = {
  title: "Auth/SignUpForm",
  component: SignUpFormWrapper,
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
} satisfies Meta<typeof SignUpFormWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state
export const Default: Story = {};

// Validation errors
export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector("form");
    const submitButton = canvasElement.querySelector('button[type="submit"]');

    if (form && submitButton) {
      fireEvent.click(submitButton);
    }
  },
};

// Invalid email format
export const InvalidEmailFormat: Story = {
  play: async ({ canvasElement }) => {
    const { usernameInput, emailInput, passwordInput, confirmPasswordInput, form, submitButton } =
      getElementsSignUpForm(canvasElement);

    if (usernameInput && emailInput && passwordInput && confirmPasswordInput) {
      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    }

    if (form && submitButton) {
      fireEvent.click(submitButton);
    }
  },
};

// Password mismatch
export const PasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const { usernameInput, emailInput, passwordInput, confirmPasswordInput, form, submitButton } =
      getElementsSignUpForm(canvasElement);

    if (passwordInput && confirmPasswordInput) {
      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "DifferentPassword123!" } });
    }

    if (form && submitButton) {
      fireEvent.click(submitButton);
    }
  },
};

// User already exists
export const UserExists: Story = {
  play: async ({ canvasElement }) => {
    const { usernameInput, emailInput, passwordInput, confirmPasswordInput, form, submitButton } =
      getElementsSignUpForm(canvasElement);

    if (usernameInput && emailInput && passwordInput && confirmPasswordInput) {
      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(emailInput, { target: { value: "linh.dt@pgt-solutions.io" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    }

    if (form && submitButton) {
      fireEvent.click(submitButton);
    }
  },
};

// Success state
export const Success: Story = {
  play: async ({ canvasElement }) => {
    const { usernameInput, emailInput, passwordInput, confirmPasswordInput, form, submitButton } =
      getElementsSignUpForm(canvasElement);

    if (usernameInput && emailInput && passwordInput && confirmPasswordInput) {
      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    }

    if (form && submitButton) {
      fireEvent.click(submitButton);
    }
  },
};
