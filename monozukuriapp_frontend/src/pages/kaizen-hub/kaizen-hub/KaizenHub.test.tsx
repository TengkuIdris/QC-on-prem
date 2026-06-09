import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import KaizenHub from "./index";

// Mock các components
jest.mock("@/components/ui/Card/Card", () => ({
  Card: ({ children, className }: any) => (
    <div
      className={className}
      data-testid="card"
    >
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div
      className={className}
      data-testid="card-content"
    >
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/Tab/Tab", () => ({
  TabContent: ({ children, value, className }: any) => (
    <div
      data-testid="tab-content"
      data-value={value}
      className={className}
    >
      {children}
    </div>
  ),
}));

// Mock HomePage component
jest.mock("@/features/kaizen-hub/home", () => {
  return function MockHomePage() {
    return <div data-testid="home-page">Home Page Content</div>;
  };
});

describe("KaizenHub Component", () => {
  const renderKaizenHub = () => {
    return render(<KaizenHub />);
  };

  describe("Layout Structure", () => {
    test("renders TabContent with correct props", () => {
      renderKaizenHub();
      const tabContent = screen.getByTestId("tab-content");

      expect(tabContent).toBeInTheDocument();
      expect(tabContent).toHaveAttribute("data-value", "home");
      expect(tabContent).toHaveClass("h-full");
    });

    test("renders Card with correct class", () => {
      renderKaizenHub();
      const card = screen.getByTestId("card");

      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("h-full");
    });

    test("renders CardContent with correct class", () => {
      renderKaizenHub();
      const cardContent = screen.getByTestId("card-content");

      expect(cardContent).toBeInTheDocument();
      expect(cardContent).toHaveClass("h-full");
    });
  });

  describe("Content Rendering", () => {
    test("renders HomePage component", () => {
      renderKaizenHub();
      const homePage = screen.getByTestId("home-page");

      expect(homePage).toBeInTheDocument();
      expect(homePage).toHaveTextContent("Home Page Content");
    });
  });

  describe("Component Structure", () => {
    test("maintains correct nesting order", () => {
      renderKaizenHub();

      const tabContent = screen.getByTestId("tab-content");
      const card = screen.getByTestId("card");
      const cardContent = screen.getByTestId("card-content");
      const homePage = screen.getByTestId("home-page");

      expect(tabContent).toContainElement(card);
      expect(card).toContainElement(cardContent);
      expect(cardContent).toContainElement(homePage);
    });
  });
});
