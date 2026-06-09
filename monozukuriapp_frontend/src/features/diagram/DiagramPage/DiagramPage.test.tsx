import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import DiagramPage from "./index";
import { configureStore } from "@reduxjs/toolkit";

jest.mock("@mui/material", () => ({
  Container: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Box: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock("@/components/ui/Button/Button", () => ({
  __esModule: true,
  default: ({ children, disabled, ...props }: any) => (
    <button
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

const createTestStore = (hasPermission = true) =>
  configureStore({
    reducer: {
      auth: () => ({
        user: {
          role: {
            FISHBONE_CREATE_PAGE: hasPermission,
          },
        },
      }),
    },
  });

describe("DiagramPage UI Components", () => {
  const renderWithProviders = (hasPermission = true) => {
    const store = createTestStore(hasPermission);
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <DiagramPage />
        </BrowserRouter>
      </Provider>,
    );
  };

  test("renders main title", () => {
    renderWithProviders();
    expect(screen.getByText("特性要因図作成ツール")).toBeInTheDocument();
  });

  test("renders section titles", () => {
    renderWithProviders();
    expect(screen.getByText("新規作成")).toBeInTheDocument();
    expect(screen.getByText("続きから")).toBeInTheDocument();
  });

  test("renders create new button with icon", () => {
    renderWithProviders();
    const createButton = screen.getByText("新規特性要因図を作成");
    expect(createButton).toBeInTheDocument();
  });

  test("renders continue button with icon", () => {
    renderWithProviders();
    const continueButton = screen.getByText("過去のデータから再開");
    expect(continueButton).toBeInTheDocument();
  });

  test("buttons are disabled when user lacks permission", () => {
    renderWithProviders(false);
    const createButton = screen.getByText("新規特性要因図を作成").closest("button");
    const continueButton = screen.getByText("過去のデータから再開").closest("button");

    expect(createButton).toBeDisabled();
    expect(continueButton).toBeDisabled();
  });

  test("renders background wave SVG", () => {
    renderWithProviders();

    const svgElement = document.querySelector("svg");
    const pathElement = screen.getByTestId("wave-path");

    expect(svgElement).toBeInTheDocument();
    expect(pathElement).toBeInTheDocument();
    expect(pathElement).toHaveAttribute("fill", "#D7ECFF");
    expect(pathElement).toHaveAttribute("fill-opacity", "1");
  });

  test("renders with correct layout structure", () => {
    renderWithProviders();

    expect(screen.getByText("特性要因図作成ツール").parentElement).toHaveClass("bg-[#EFF6FF]");

    const boxes = document.querySelectorAll(".bg-white");
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toHaveClass("w-4/5");
    expect(boxes[1]).toHaveClass("w-4/5");
  });
});
