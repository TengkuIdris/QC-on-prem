import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReviewForm from "./index";
import { BrowserRouter } from "react-router-dom";

// Mock dependencies
jest.mock("@/services/apis/kaizenhubService", () => ({
  creatReview: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ReviewForm Component UI", () => {
  const renderReviewForm = (props = {}) => {
    return render(
      <BrowserRouter>
        <ReviewForm {...props} />
      </BrowserRouter>,
    );
  };

  describe("Layout Elements", () => {
    test("should render Paper component with correct styles", () => {
      renderReviewForm();
      const paper = screen.getByTestId("review-form-paper");

      expect(paper).toHaveClass("MuiPaper-elevation4");
      expect(paper).toHaveClass("w-full");
      expect(paper).toHaveStyle({
        borderRadius: "8px",
        paddingTop: "32px",
        paddingBottom: "32px",
        height: "100%",
      });
    });

    test("should render Card component with correct classes", () => {
      renderReviewForm();
      const card = screen.getByTestId("review-form-card");

      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("w-full");
      expect(card).toHaveClass("max-w-2xl");
      expect(card).toHaveClass("mx-auto");
    });
  });

  describe("Form Header", () => {
    test("should render title and recipe name", () => {
      const recipeName = "Test Recipe";
      renderReviewForm({ recipeName });

      expect(screen.getByText("改善レシピのレビュー")).toBeInTheDocument();
      expect(screen.getByText(recipeName)).toBeInTheDocument();
    });

    test("should render default recipe name when not provided", () => {
      renderReviewForm();
      expect(screen.getByText("5S導入による作業効率向上")).toBeInTheDocument();
    });
  });

  describe("Form Controls", () => {
    test("should render all form sections", () => {
      renderReviewForm();

      expect(screen.getByText("総合評価")).toBeInTheDocument();
      expect(screen.getByText("コメント（任意）")).toBeInTheDocument();
      expect(screen.getByText("この改善レシピの影響力")).toBeInTheDocument();
      expect(screen.getByText("この改善レシピの主な魅力は？（複数選択可）")).toBeInTheDocument();
      expect(screen.getByText("この改善レシピをどのように活用しましたか？")).toBeInTheDocument();
      expect(screen.getByText("この改善レシピに関連するキーワード（任意）")).toBeInTheDocument();
    });

    test("should render comment textarea", () => {
      renderReviewForm();
      const textarea = screen.getByPlaceholderText("この改善レシピについてのご意見をお聞かせください");
      expect(textarea).toBeInTheDocument();
    });

    test("should render impact radio buttons", () => {
      renderReviewForm();
      expect(screen.getByText("小さい")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("大きい")).toBeInTheDocument();
    });

    test("should render attraction checkboxes", () => {
      renderReviewForm();
      expect(screen.getByText("実行しやすい")).toBeInTheDocument();
      expect(screen.getByText("効果が高い")).toBeInTheDocument();
      expect(screen.getByText("独創的")).toBeInTheDocument();
    });

    test("should render usage radio buttons", () => {
      renderReviewForm();
      expect(screen.getByText("参考にした")).toBeInTheDocument();
      expect(screen.getByText("一部を実践した")).toBeInTheDocument();
      expect(screen.getByText("全て実践した")).toBeInTheDocument();
      expect(screen.getByText("まだ活用していない")).toBeInTheDocument();
    });

    test("should render keyword input", () => {
      renderReviewForm();
      const input = screen.getByPlaceholderText("関連するキーワードをカンマ区切りで入力（例：時間短縮,品質向上）");
      expect(input).toBeInTheDocument();
    });
  });

  describe("Submit Button", () => {
    test("should render submit button", () => {
      renderReviewForm();
      const submitButton = screen.getByText("レビュー投稿");
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled(); // Should be disabled initially
    });
  });

  describe("Form Layout", () => {
    test("should render attraction grid layout", () => {
      renderReviewForm();
      const grid = screen.getByTestId("attraction-grid");
      expect(grid).toHaveStyle({
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      });
    });
  });
});
