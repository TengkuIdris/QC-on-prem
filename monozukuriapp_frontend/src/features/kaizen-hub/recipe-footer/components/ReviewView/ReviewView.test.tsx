import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReviewView from "./index";
import { attraction, impacts, usages } from "@/pages/kaizen-hub/kaizen-hub-demo-review";

describe("ReviewView", () => {
  const mockData = {
    author: "Test User",
    rate: 4,
    comment: "Test comment content",
    impactPercent: impacts[0].key,
    attraction: JSON.stringify({
      [attraction[0].key]: true,
      [attraction[1].key]: false,
      [attraction[2].key]: true,
    }),
    howUse: usages[0].key,
    keyword: "test keyword",
  };

  const renderReviewView = (customData = mockData) => {
    return render(<ReviewView data={customData} />);
  };

  describe("Form Controls", () => {
    beforeEach(() => {
      renderReviewView();
    });

    test("should render all section headers", () => {
      expect(screen.getByText("総合評価")).toBeInTheDocument();
      expect(screen.getByText("コメント（任意）")).toBeInTheDocument();
      expect(screen.getByText("この改善レシピの影響力")).toBeInTheDocument();
      expect(screen.getByText("この改善レシピの主な魅力は？（複数選択可）")).toBeInTheDocument();
      expect(screen.getByText("この改善レシピをどのように活用しましたか？")).toBeInTheDocument();
    });

    test("should render all impact radio buttons in disabled state", () => {
      impacts.forEach((impact) => {
        const radio = screen.getByLabelText(impact.label);
        expect(radio).toBeInTheDocument();
        expect(radio).toBeDisabled();
      });
    });

    test("should render all attraction checkboxes in disabled state", () => {
      attraction.forEach((attr) => {
        const checkbox = screen.getByLabelText(attr.label);
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toBeDisabled();
      });
    });

    test("should render all usage options in disabled state", () => {
      usages.forEach((usage) => {
        const radio = screen.getByLabelText(usage.label);
        expect(radio).toBeInTheDocument();
        expect(radio).toBeDisabled();
      });
    });
  });

  describe("Optional Fields Display", () => {
    test("should display comment when provided", () => {
      renderReviewView();
      expect(screen.getByText("Test comment content")).toBeInTheDocument();
    });

    test("should not display comment when empty", () => {
      const dataWithoutComment = { ...mockData, comment: "" };
      renderReviewView(dataWithoutComment);
      expect(screen.queryByText("Test comment content")).not.toBeInTheDocument();
    });

    test("should display keyword when provided", () => {
      renderReviewView();
      expect(screen.getByText("test keyword")).toBeInTheDocument();
    });

    test("should not display keyword when empty", () => {
      const dataWithoutKeyword = { ...mockData, keyword: "" };
      renderReviewView(dataWithoutKeyword);
      expect(screen.queryByText("test keyword")).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    test("should not crash when data is undefined", () => {
      expect(() => renderReviewView(undefined)).not.toThrow();
    });
  });
});
