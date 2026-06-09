import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import KaizenHubPreviewPost from "./index";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

// Mock dependencies
jest.mock("@/pages/kaizen-hub/kaizen-hub-detail-post/components/ImprovementDetails", () => {
  return function MockImprovementDetails() {
    return <div data-testid="improvement-details">Improvement Details</div>;
  };
});

// Mock store
const mockStore = configureStore({
  reducer: {
    auth: () => ({
      user: {
        name: "Test User",
      },
    }),
  },
});

describe("KaizenHubPreviewPost Component UI", () => {
  const mockProps = {
    setStep: jest.fn(),
    handleToggleModal: jest.fn(),
    dataChanged: {
      title: "Test Recipe",
      createdAt: "2024-03-20T10:00:00Z",
      situationBeforeImprovement: "Before line 1\nBefore line 2",
      situationAfterImprovement: "After line 1\nAfter line 2",
      improvementProcedures: "Step 1\nStep 2",
      labels: ["Label 1", "Label 2"],
      tipsAndTricks: "Test tips",
      beforeImage: null,
      afterImage: null,
    },
    isSubmitted: false,
  };

  const renderPreviewPost = (props = mockProps) => {
    return render(
      <Provider store={mockStore}>
        <KaizenHubPreviewPost {...props} />
      </Provider>,
    );
  };

  describe("Header Section", () => {
    test("should render title and author info", () => {
      renderPreviewPost();

      expect(screen.getByText(`改善レシピ：${mockProps.dataChanged.title}`)).toBeInTheDocument();
      expect(screen.getByText(/Test User/)).toBeInTheDocument();
      expect(screen.getByText(/2024\/03\/20/)).toBeInTheDocument();
    });

    test("should render comparison title", () => {
      renderPreviewPost();
      expect(screen.getByText("改善前後の比較")).toBeInTheDocument();
    });
  });

  describe("Image Section", () => {
    test("should render placeholder when images are not provided", () => {
      renderPreviewPost();

      const placeholders = screen.getAllByText("400");
      expect(placeholders).toHaveLength(2);
    });

    test("should render before and after situations", () => {
      renderPreviewPost();

      expect(screen.getByText("Before line 1")).toBeInTheDocument();
      expect(screen.getByText("Before line 2")).toBeInTheDocument();
      expect(screen.getByText("After line 1")).toBeInTheDocument();
      expect(screen.getByText("After line 2")).toBeInTheDocument();
    });
  });

  describe("Improvement Details", () => {
    test("should render improvement details component", () => {
      renderPreviewPost();
      expect(screen.getByTestId("improvement-details")).toBeInTheDocument();
    });

    test("should render procedures section", () => {
      renderPreviewPost();

      expect(screen.getByText("詳細な改善手順")).toBeInTheDocument();
      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 2")).toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    test("should render edit and submit buttons", () => {
      renderPreviewPost();

      expect(screen.getByText("投稿内容の修正")).toBeInTheDocument();
      expect(screen.getByText("投稿")).toBeInTheDocument();
    });

    test("should disable buttons when isSubmitted is true", () => {
      renderPreviewPost({
        ...mockProps,
        isSubmitted: true,
      });

      const editButton = screen.getByText("投稿内容の修正");
      const submitButton = screen.getByText("投稿");

      expect(editButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Layout Structure", () => {
    test("should apply proper spacing", () => {
      renderPreviewPost();

      const separator = screen.getByTestId("separator");
      expect(separator).toHaveClass("my-6");
    });
  });
});
