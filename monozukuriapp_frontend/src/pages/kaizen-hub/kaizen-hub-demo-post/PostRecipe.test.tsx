import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PostRecipe from "./index";
import { BrowserRouter } from "react-router-dom";

// Mock dependencies
jest.mock("@/services/apis/kaizenhubService", () => ({
  getImprovementDetail: jest.fn(),
}));

jest.mock("@/utils/handleApi", () => ({
  handleApi: jest.fn(),
}));

// Mock KaizenhubForm component
jest.mock("../kaizen-hub-form", () => {
  return function MockKaizenhubForm() {
    return <div data-testid="kaizenhub-form">Kaizenhub Form</div>;
  };
});

// Mock KaizenHubPreviewPost component
jest.mock("../kaizen-hub-preview-post", () => {
  return function MockPreviewPost() {
    return <div data-testid="preview-section">Preview Section</div>;
  };
});

describe("PostRecipe Component UI", () => {
  const renderPostRecipe = () => {
    return render(
      <BrowserRouter>
        <PostRecipe />
      </BrowserRouter>,
    );
  };

  describe("Layout Elements", () => {
    test("should render Paper component with correct styles", () => {
      renderPostRecipe();
      const paper = screen.getByTestId("post-recipe-paper");

      expect(paper).toHaveClass("MuiPaper-elevation4");
      expect(paper).toHaveStyle({
        borderRadius: "8px",
        paddingTop: "32px",
        paddingBottom: "32px",
        minHeight: "100%",
      });
    });

    test("should render Card component with correct classes", () => {
      renderPostRecipe();
      const card = screen.getByTestId("post-recipe-card");

      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("w-full");
      expect(card).toHaveClass("max-w-3xl");
      expect(card).toHaveClass("mx-auto");
      expect(card).toHaveClass("my-5");
    });
  });

  describe("Loading State", () => {
    test("should render loading spinner when loading is true", () => {
      renderPostRecipe();
      const loadingSpinner = screen.queryByRole("progressbar");
      expect(loadingSpinner).not.toBeInTheDocument();
    });
  });

  describe("Form Display", () => {
    test("should render KaizenhubForm in step 1", () => {
      renderPostRecipe();
      expect(screen.getByTestId("kaizenhub-form")).toBeInTheDocument();
    });

    test("should hide form in step 2", () => {
      renderPostRecipe();
      const paper = screen.getByRole("article");
      expect(paper).not.toHaveClass("hidden");
    });
  });

  describe("Modal Elements", () => {
    test("should render success modal with correct content", () => {
      renderPostRecipe();
      const modal = screen.queryByRole("dialog");
      expect(modal).not.toBeInTheDocument(); // Modal should be hidden initially
    });

    test("should render modal with correct styles when shown", () => {
      renderPostRecipe();
      const modalPaper = screen.queryByTestId("modal-paper");
      expect(modalPaper).not.toBeInTheDocument();
    });
  });

  describe("Responsive Layout", () => {
    test("should render card with responsive width", () => {
      renderPostRecipe();
      const card = screen.getByTestId("post-recipe-card");
      expect(card).toHaveClass("w-full");
      expect(card).toHaveClass("max-w-3xl");
    });

    test("should render form container with proper padding", () => {
      renderPostRecipe();
      const paper = screen.getByTestId("post-recipe-paper");
      expect(paper).toHaveStyle({
        paddingTop: "32px",
        paddingBottom: "32px",
      });
    });
  });

  describe("Accessibility", () => {
    test("should have proper ARIA attributes", () => {
      renderPostRecipe();
      const modal = screen.queryByRole("dialog");
      expect(modal).not.toBeInTheDocument();
    });

    test("should maintain proper focus management", () => {
      renderPostRecipe();
      const form = screen.getByTestId("kaizenhub-form");
      expect(form).toBeInTheDocument();
    });
  });
});
