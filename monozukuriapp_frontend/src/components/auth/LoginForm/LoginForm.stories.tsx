import React, { ComponentType, FC, useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import LoginForm from "./LoginForm";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fireEvent } from "@storybook/testing-library";
import { BrowserRouter } from "react-router-dom";

const getElementsLoginForm = (canvasElement: HTMLElement) => {
  const emailInput = canvasElement.querySelector('input[name="email"]') as HTMLInputElement;
  const passwordInput = canvasElement.querySelector('input[name="password"]') as HTMLInputElement;
  const form = canvasElement.querySelector("form");
  const submitButton = canvasElement.querySelector('button[type="submit"]');
  return { emailInput, passwordInput, form, submitButton };
};

const mockStore = configureStore({
  reducer: {
    auth: (state = {}) => state,
  },
});

const LoginFormWrapper: FC<{ initialValues?: { email: string; password: string } }> = ({ initialValues }) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (initialValues) {
      localStorage.setItem("email", initialValues.email);
      localStorage.setItem("password", initialValues.password);
      localStorage.setItem("rememberMe", "true");
    }
    setKey((prev) => prev + 1);
  }, [initialValues]);

  return (
    <Provider store={mockStore}>
      <BrowserRouter>
        <LoginForm key={key} />
        <ToastContainer />
      </BrowserRouter>
    </Provider>
  );
};

const meta = {
  title: "Auth/LoginForm",
  component: LoginFormWrapper,
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
} satisfies Meta<typeof LoginFormWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialValues: undefined,
  },
};

export const WithRememberMe: Story = {
  args: {
    initialValues: {
      email: "test@example.com",
      password: "Test123!@#",
    },
  },
};

export const ValidateEmailAndPassword: Story = {
  args: {
    initialValues: {
      email: "invalid-email",
      password: "weak",
    },
  },
  play: async ({ canvasElement }) => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { emailInput, passwordInput, form, submitButton } = getElementsLoginForm(canvasElement);

    if (emailInput && passwordInput) {
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.change(passwordInput, { target: { value: "weak" } });
    }

    if (form && submitButton) {
      fireEvent.click(submitButton);
    }
  },
};

export const EmailOrPasswordIncorrect: Story = {
  args: {
    initialValues: {
      email: "test@example.com",
      password: "Test123!@#",
    },
  },
  play: async () => {
    toast.error("メールまたはパスワードが正しくありません。");
  },
};

export const UserDoesNotExist: Story = {
  args: {
    initialValues: {
      email: "test@example.com",
      password: "Test123!@#",
    },
  },
  play: async () => {
    toast.error("ユーザーが存在しません。");
  },
};

export const WithSuccess: Story = {
  args: {
    initialValues: {
      email: "linh.dt@pgt-solutions.io",
      password: "Password@123",
    },
  },
  play: async () => {
    toast.success("ログインは成功しました");
  },
};
