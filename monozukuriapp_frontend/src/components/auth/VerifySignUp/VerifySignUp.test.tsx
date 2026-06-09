import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import SignUpVerifyForm from "./index";

// Mock các dependencies
jest.mock("@/services/apis/authService", () => ({
  verifyCode: jest.fn(),
  resendCode: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    loading: jest.fn(() => "toast-id"),
    update: jest.fn(),
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

jest.mock("@/utils/handleApi");

describe("SignUpVerifyForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderVerifyForm = () => {
    return render(
      <BrowserRouter>
        <SignUpVerifyForm />
      </BrowserRouter>,
    );
  };

  test("renders verify form with code input field", () => {
    renderVerifyForm();
    expect(screen.getByLabelText("検証コード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "確認する" })).toBeInTheDocument();
  });

  test("displays validation error for empty code", async () => {
    renderVerifyForm();
    const submitButton = screen.getByRole("button", { name: "確認する" });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("コードは必須です")).toBeInTheDocument();
    });
  });

  test("displays validation error for invalid code format", async () => {
    renderVerifyForm();
    const codeInput = screen.getByLabelText("検証コード");
    const submitButton = screen.getByRole("button", { name: "確認する" });

    fireEvent.change(codeInput, { target: { value: "123" } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(screen.getByText("コードは6文字以内で入力してください。")).toBeInTheDocument();
    });
  });

  test("displays validation error for non-numeric code", async () => {
    renderVerifyForm();
    const codeInput = screen.getByLabelText("検証コード");
    const submitButton = screen.getByRole("button", { name: "確認する" });

    fireEvent.change(codeInput, { target: { value: "abc123" } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(screen.getByText("コードが正しくありません")).toBeInTheDocument();
    });
  });

  test("renders back link", () => {
    renderVerifyForm();
    const backLink = screen.getByText("戻る");
    expect(backLink).toBeInTheDocument();
    expect(backLink.getAttribute("href")).toBe("/auth/register");
  });
});
