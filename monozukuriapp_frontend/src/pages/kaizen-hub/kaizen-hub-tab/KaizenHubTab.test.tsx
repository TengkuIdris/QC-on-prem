import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import KaizenHubTab from "./index";

// Mock các components UI
jest.mock("@mui/material", () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Stack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock("@/components/ui/Button/Button", () => ({
  CustomButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/Tab/Tab", () => ({
  Tab: ({ children, className }: any) => (
    <div
      className={className}
      data-testid="tab-component"
    >
      {children}
    </div>
  ),
  TabList: ({ children, className }: any) => (
    <div
      className={className}
      data-testid="tab-list"
    >
      {children}
    </div>
  ),
  TabTrigger: ({ children, value, disabled }: any) => (
    <button
      disabled={disabled}
      value={value}
      data-testid="tab-trigger"
    >
      {children}
    </button>
  ),
}));

describe("KaizenHubTab Component UI", () => {
  const mockStore = configureStore({
    reducer: {
      auth: () => ({
        user: {
          role: {
            KAIZENHUB_POST_AND_VIEW: true,
          },
        },
      }),
    },
  });

  const renderKaizenHubTab = () => {
    return render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <KaizenHubTab />
        </BrowserRouter>
      </Provider>,
    );
  };

  describe("Header UI", () => {
    test("renders logo with correct styling", () => {
      renderKaizenHubTab();
      const logo = screen.getByRole("img", { name: "logo" });
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveClass("h-[70px]", "cursor-pointer");
    });

    test("renders title and subtitle", () => {
      renderKaizenHubTab();
      const title = screen.getByText("カイゼンハブ");
      const subtitle = screen.getByText("~カイゼンは世界を変える");

      expect(title).toHaveClass("text-4xl", "font-bold", "ml-4", "text-white");
      expect(subtitle).toHaveClass("text-2xl", "text-white");
    });
  });

  describe("Navigation UI", () => {
    test("renders navigation tabs with correct structure", () => {
      renderKaizenHubTab();
      const tabList = screen.getByTestId("tab-list");
      expect(tabList).toHaveClass(
        "grid",
        "w-full",
        "grid-cols-2",
        "gap-2",
        "sm:grid-cols-3",
        "md:grid-cols-5",
        "py-6",
        "px-2",
        "bg-[#EAEAEA]",
        "border",
        "border-black",
      );
    });

    test("renders all tab triggers", () => {
      renderKaizenHubTab();
      const tabTriggers = screen.getAllByTestId("tab-trigger");
      expect(tabTriggers).toHaveLength(5);
    });
  });

  describe("Footer UI", () => {
    test("renders footer with correct styling", () => {
      renderKaizenHubTab();
      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("mt-2", "bg-[#EAEAEA]", "border", "border-black", "p-2");
    });

    test("renders footer links with correct layout", () => {
      renderKaizenHubTab();
      const linkContainer = screen.getByRole("contentinfo").querySelector("[data-testid='footer-links']");
      expect(linkContainer).toHaveClass("flex", "flex-col", "md:flex-row", "mt-4", "gap-4");
    });
  });

  describe("Layout Structure", () => {
    test("renders main container with correct styling", () => {
      renderKaizenHubTab();
      const mainContainer = screen.getByTestId("tab-component");
      expect(mainContainer).toHaveClass("flex-grow", "flex", "flex-col");
    });
  });
});
