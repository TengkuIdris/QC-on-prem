import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { toast } from "react-toastify";
import { resetPassword } from "aws-amplify/auth";
import EmailForm from "./index";

jest.mock("aws-amplify/auth", () => ({
  resetPassword: jest.fn(),
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

describe("EmailForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderEmailForm = () => {
    return render(
      <BrowserRouter>
        <EmailForm />
      </BrowserRouter>,
    );
  };

  test("renders email input field and submit button", () => {
    renderEmailForm();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "メールへ送信" })).toBeInTheDocument();
  });

  test("displays validation error for invalid email", async () => {
    renderEmailForm();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "invalid-email" },
    });

    fireEvent.blur(screen.getByLabelText("メールアドレス"));

    fireEvent.click(screen.getByRole("button", { name: "メールへ送信" }));

    await waitFor(() => {
      const errorMessage = screen.getByText("メールアドレス形式は不正です");
      expect(errorMessage).toBeInTheDocument();
    });
  });

  test("displays validation error for empty email", async () => {
    renderEmailForm();
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "" },
    });

    fireEvent.blur(screen.getByLabelText("メールアドレス"));

    fireEvent.click(screen.getByRole("button", { name: "メールへ送信" }));

    await waitFor(() => {
      const errorMessage = screen.getByText("メールアドレス形式は不正です");
      expect(errorMessage).toBeInTheDocument();
    });
  });

  test("handles successful password reset request", async () => {
    (resetPassword as jest.Mock).mockResolvedValueOnce({
      nextStep: { resetPasswordStep: "CONFIRM_RESET_PASSWORD_WITH_CODE" },
    });

    renderEmailForm();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "linh.dt@pgt-solutions.io" },
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: "メールへ送信" }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        username: "linh.dt@pgt-solutions.io",
      });
      expect(toast.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          render: "メールへ送信しました。",
          type: "success",
        }),
      );
    });
  });

  test("handles password reset request error", async () => {
    const errorMessage = "Username/client id combination not found.";
    (resetPassword as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    renderEmailForm();
    const emailInput = screen.getByLabelText("メールアドレス");
    const submitButton = screen.getByRole("button", { name: "メールへ送信" });

    fireEvent.change(emailInput, { target: { value: "linh.dt@pgt-solutions.io" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.update).toHaveBeenCalledWith("toast-id", {
        render: "ユーザーの電子メールが見つかりません",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    });
  });

  test("renders login link", () => {
    renderEmailForm();
    const loginLink = screen.getByText("ログイン");
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.getAttribute("href")).toBe("/auth/login");
  });
});
