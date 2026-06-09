import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { toast } from "react-toastify";
import { confirmResetPassword } from "aws-amplify/auth";
import CodeForm from "./index";

// Mock dependencies
jest.mock("aws-amplify/auth", () => ({
  confirmResetPassword: jest.fn(),
  resetPassword: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("crypto-js/aes", () => ({
  decrypt: jest.fn(() => ({
    toString: () => "test@example.com",
  })),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams({ id: "encrypted-email" })],
}));

describe("CodeForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderCodeForm = () => {
    return render(
      <BrowserRouter>
        <CodeForm />
      </BrowserRouter>,
    );
  };

  test("renders verify code form with all fields", () => {
    renderCodeForm();
    expect(screen.getByLabelText("検証コード")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワードの確認")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "パスワードの確認" })).toBeInTheDocument();
    expect(screen.getByText("コードを再送信する")).toBeInTheDocument();
  });

  test("displays validation errors for empty fields", async () => {
    renderCodeForm();
    const submitButton = screen.getByRole("button", { name: "パスワードの確認" });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("コードは必須です")).toBeInTheDocument();
      expect(screen.getByText("パスワードは必須です")).toBeInTheDocument();
      expect(screen.getByText("パスワードの確認は必須です")).toBeInTheDocument();
    });
  });

  test("shows validation error for password less than 8 characters", async () => {
    renderCodeForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Short1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "パスワードの確認" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードは８文字以上で入力してください。")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without lowercase letter", async () => {
    renderCodeForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "PASSWORD1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "パスワードの確認" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの小文字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without uppercase letter", async () => {
    renderCodeForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "パスワードの確認" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの大文字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without number", async () => {
    renderCodeForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Password!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "パスワードの確認" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの数字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without special character", async () => {
    renderCodeForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Password1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "パスワードの確認" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの特殊文字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password mismatch", async () => {
    renderCodeForm();
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

  test("handles password reset failure", async () => {
    renderCodeForm();
    (confirmResetPassword as jest.Mock).mockRejectedValueOnce(new Error());

    // Fill form
    fireEvent.change(screen.getByLabelText("検証コード"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "NewPassword1!" },
    });
    fireEvent.change(screen.getByLabelText("パスワードの確認"), {
      target: { value: "NewPassword1!" },
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: "パスワードの確認" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("パスワードの変更に失敗しました。");
    });
  });
});
