import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import FtaPage from "./index";
import { configureStore } from "@reduxjs/toolkit";

jest.mock("@mui/material", () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Container: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Button: ({ children, disabled, ...props }: any) => (
    <button
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
  Grid: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Paper: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

const createTestStore = (hasPermission = true) =>
  configureStore({
    reducer: {
      auth: () => ({
        user: {
          role: {
            FTA_CREATE_PAGE: hasPermission,
          },
        },
      }),
    },
  });

describe("FtaPage UI Components", () => {
  const renderWithProviders = (hasPermission = true) => {
    const store = createTestStore(hasPermission);
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <FtaPage />
        </BrowserRouter>
      </Provider>,
    );
  };

  test("renders main title correctly", () => {
    renderWithProviders();
    expect(screen.getByText("FTA（フォルトツリー解析）ツール")).toBeInTheDocument();
  });

  test("renders section titles", () => {
    renderWithProviders();
    expect(screen.getByText("新規作成")).toBeInTheDocument();
    expect(screen.getByText("続きから")).toBeInTheDocument();
  });

  test("renders action buttons", () => {
    renderWithProviders();
    expect(screen.getByText("新規FTA図を作成")).toBeInTheDocument();
    expect(screen.getByText("過去のデータから再開")).toBeInTheDocument();
  });

  test("renders file input", () => {
    renderWithProviders();
    expect(screen.getByTestId("file-input")).toBeInTheDocument();
  });

  test("buttons are disabled when user lacks permission", () => {
    renderWithProviders(false);
    const createButton = screen.getByText("新規FTA図を作成");
    const continueButton = screen.getByText("過去のデータから再開");

    expect(createButton).toBeDisabled();
    expect(continueButton).toBeDisabled();
  });

  test("renders background decoration", () => {
    renderWithProviders();
    const backgroundImage = screen.getByAltText("background-decoration");
    expect(backgroundImage).toBeInTheDocument();
    expect(backgroundImage).toHaveAttribute("src", "/image/background-decoration.svg");
  });
});
