import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import LoginForm from "./LoginForm";
import { signIn } from "aws-amplify/auth";
import authService from "../../../services/apis/authService";
import { toast } from "react-toastify";

// Mock các dependencies
jest.mock("aws-amplify/auth", () => ({
  signIn: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    loading: jest.fn(() => "toast-id"),
    update: jest.fn(),
  },
}));

jest.mock("../../../services/apis/authService", () => ({
  me: jest.fn(),
}));

jest.mock("../../../core/hooks", () => ({
  useAppDispatch: jest.fn(() => jest.fn()),
}));

// Mock store
const mockStore = configureStore({
  reducer: {
    auth: (state = {}) => state,
  },
});

// Helper function để render component với các providers cần thiết
const renderLoginForm = () => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    </Provider>,
  );
};

describe("LoginForm", () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("renders login form with all fields", () => {
    renderLoginForm();

    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("ログイン状態を保持")).toBeInTheDocument();
    expect(screen.getByText("パスワードを忘れました")).toBeInTheDocument();
    expect(screen.getByText("新規登録")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  test("shows validation errors for empty fields", async () => {
    renderLoginForm();

    const submitButton = screen.getByRole("button", { name: "ログイン" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("メールアドレスは必須です")).toBeInTheDocument();
      expect(screen.getByText("パスワードは必須です")).toBeInTheDocument();
    });
  });

  test("shows validation error for invalid email", async () => {
    renderLoginForm();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "invalid-email" },
    });

    fireEvent.blur(screen.getByLabelText("メールアドレス"));

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      const errorMessage = screen.getByText("メールアドレス形式は不正です");
      expect(errorMessage).toBeInTheDocument();
    });
  });

  test("accepts valid email format", async () => {
    renderLoginForm();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "test@example.com" },
    });

    fireEvent.blur(screen.getByLabelText("メールアドレス"));

    await waitFor(() => {
      const errorMessage = screen.queryByText("メールアドレス形式は不正です");
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  test("shows validation error for password less than 8 characters", async () => {
    renderLoginForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Short1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードは８文字以上で入力してください。")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without lowercase letter", async () => {
    renderLoginForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "PASSWORD1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの小文字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without uppercase letter", async () => {
    renderLoginForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの大文字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without number", async () => {
    renderLoginForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Password!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの数字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("shows validation error for password without special character", async () => {
    renderLoginForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Password1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードには少なくとも1つの特殊文字を含める必要があります")).toBeInTheDocument();
    });
  });

  test("accepts valid password format", async () => {
    renderLoginForm();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Valid1!" },
    });

    fireEvent.blur(screen.getByLabelText("パスワード"));

    await waitFor(() => {
      const errorMessage = screen.queryByText("パスワードは８文字以上で入力してください。");
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  test("handles successful login", async () => {
    const mockSignInResponse = {
      isSignedIn: true,
      nextStep: { signInStep: "DONE" },
    };
    (signIn as jest.Mock).mockResolvedValueOnce(mockSignInResponse);

    const mockUserData = {
      data: {
        email: "test@example.com",
        id: "1",
        name: "Test User",
        company: "Test Company",
        department: "Test Department",
        plansDetails: [],
      },
    };
    (authService.me as jest.Mock).mockResolvedValueOnce(mockUserData);

    renderLoginForm();

    // Fill in form
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "linh.dt@pgt-solutions.io" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Password@123" },
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({
        username: "linh.dt@pgt-solutions.io",
        password: "Password@123",
      });
      expect(toast.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          render: "ログインは成功しました",
          type: "success",
        }),
      );
    });
  });

  test("handles login failure", async () => {
    (signIn as jest.Mock).mockRejectedValueOnce(new Error("Incorrect username or password."));

    renderLoginForm();

    // Fill in form
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "linh.dt@pgt-solutions.io" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "Invalid1!" },
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(toast.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          render: "メールまたはパスワードが正しくありません。",
          type: "error",
        }),
      );
    });
  });
});
