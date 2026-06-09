import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import SignUpForm from "./index";

// Mock các dependencies
jest.mock("@/services/apis/authService", () => ({
  register: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    loading: jest.fn(() => "toast-id"),
    update: jest.fn(),
  },
}));

jest.mock("crypto-js/aes", () => ({
  encrypt: jest.fn(() => "encrypted-email"),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("SignUpForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSignUpForm = () => {
    return render(
      <BrowserRouter>
        <SignUpForm />
      </BrowserRouter>,
    );
  };

  test("renders signup form with all fields", () => {
    renderSignUpForm();
    expect(screen.getByLabelText("ユーザー名")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワードの確認")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新規登録" })).toBeInTheDocument();
  });

  test("displays validation errors for empty fields", async () => {
    renderSignUpForm();
    const submitButton = screen.getByRole("button", { name: "新規登録" });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("ユーザー名は必須です")).toBeInTheDocument();
      expect(screen.getByText("メールアドレスは必須です")).toBeInTheDocument();
      expect(screen.getByText("パスワードは必須です")).toBeInTheDocument();
      expect(screen.getByText("パスワードの確認は必須です")).toBeInTheDocument();
    });
  });

  test("displays validation error for invalid email", async () => {
    renderSignUpForm();
    const emailInput = screen.getByLabelText("メールアドレス");

    fireEvent.change(emailInput, {
      target: { value: "invalid-email" },
    });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText("メールアドレス形式は不正です")).toBeInTheDocument();
    });
  });

  test("displays validation error for empty email", async () => {
    renderSignUpForm();
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "" },
    });

    fireEvent.blur(screen.getByLabelText("メールアドレス"));

    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));

    await waitFor(() => {
      const errorMessage = screen.getByText("メールアドレスは必須です");
      expect(errorMessage).toBeInTheDocument();
    });
  });

  test("shows validation error for password less than 8 characters", async () => {
    renderSignUpForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Short1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードは８文字以上で入力してください。")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without lowercase letter", async () => {
    renderSignUpForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "PASSWORD1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの小文字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without uppercase letter", async () => {
    renderSignUpForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの大文字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without number", async () => {
    renderSignUpForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Password!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの数字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without special character", async () => {
    renderSignUpForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Password1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの特殊文字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("accepts valid password format", async () => {
    renderSignUpForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Valid1!" },
    });

    fireEvent.blur(screen.getByLabelText("パスワード"));

    await waitFor(() => {
      const errorMessage = screen.queryByText("パスワードは８文字以上で入力してください。");
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  test("displays validation error for password mismatch", async () => {
    renderSignUpForm();
    const passwordInput = screen.getByLabelText("パスワード");
    const confirmPasswordInput = screen.getByLabelText("パスワードの確認");

    fireEvent.change(passwordInput, {
      target: { value: "StrongPass1!" },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "DifferentPass1!" },
    });
    fireEvent.blur(confirmPasswordInput);

    await waitFor(() => {
      expect(screen.getByText("パスワードが一致しません")).toBeInTheDocument();
    });
  });

  test("renders login link", () => {
    renderSignUpForm();
    const loginLink = screen.getByText("既にアカウントがありますか？ログイン");
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.getAttribute("href")).toBe("/auth/login");
  });
});
