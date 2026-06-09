import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DetailPost, { DetailPostProps } from "./index";
import { BrowserRouter } from "react-router-dom";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { toast } from "react-toastify";
import { IImprovement } from "@/interfaces";
import { TypeImprovement } from "@/enum/kaizenhub/typeImprovement";

// Mock dependencies
jest.mock("@/services/apis/kaizenhubService", () => ({
  favoriteImprovement: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock("@/features/kaizen-hub/recipe-footer", () => {
  return {
    __esModule: true,
    default: () => <div data-testid="recipe-footer">Recipe Footer</div>,
  };
});

const mockData: IImprovement = {
  id: 1,
  title: "Test Recipe",
  createdAt: "2024-03-20T10:00:00Z",
  user: {
    name: "Test User",
    id: 1,
    email: "test@example.com",
    password: "password",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  isFavorite: false,
  beforeImage: "before.jpg",
  afterImage: "after.jpg",
  situationBeforeImprovement: "Before line 1\nBefore line 2",
  situationAfterImprovement: "After line 1\nAfter line 2",
  labels: [
    { label: { id: 1, title: "Test Label", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } },
  ],
  tipsAndTricks: "Test tips",
  improvementProcedures: "Step 1\nStep 2",
  userId: 0,
  description: "",
  type: TypeImprovement.FIVES,
  updatedAt: "",
  isLike: false,
  _count: {
    likes: 0,
  },
};

describe("DetailPost Component", () => {
  const renderDetailPost = (props: DetailPostProps = { data: mockData, isStart: true }) => {
    return render(
      <BrowserRouter>
        <DetailPost {...props} />
      </BrowserRouter>,
    );
  };

  describe("Basic Content Display", () => {
    test("should render title and author information", () => {
      renderDetailPost();

      expect(screen.getByText(`改善レシピ：${mockData.title}`)).toBeInTheDocument();
      expect(screen.getByText(/Test User/)).toBeInTheDocument();
      expect(screen.getByText(/2024\/03\/20/)).toBeInTheDocument();
    });

    test("should render improvement procedures", () => {
      renderDetailPost();

      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 2")).toBeInTheDocument();
    });

    test("should render before and after situations", () => {
      renderDetailPost();

      expect(screen.getByText("Before line 1")).toBeInTheDocument();
      expect(screen.getByText("Before line 2")).toBeInTheDocument();
      expect(screen.getByText("After line 1")).toBeInTheDocument();
      expect(screen.getByText("After line 2")).toBeInTheDocument();
    });
  });

  describe("Image Display", () => {
    test("should render placeholder when images are not provided", () => {
      const dataWithoutImages = {
        ...mockData,
        beforeImage: "",
        afterImage: "",
      };
      renderDetailPost({ data: dataWithoutImages, isStart: true });

      const placeholders = screen.getAllByText("400");
      expect(placeholders).toHaveLength(2);
    });
  });

  describe("Favorite Functionality", () => {
    test("should show error toast when favorite action fails", async () => {
      (kaiZenHubService.favoriteImprovement as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

      renderDetailPost();

      const starIcon = screen.getByTestId("StarIcon");
      fireEvent.click(starIcon);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("お気に入りに追加できませんでした");
      });
    });

    test("should not show star icon when isStart is false", () => {
      renderDetailPost({ data: mockData, isStart: false });
      expect(screen.queryByTestId("StarIcon")).not.toBeInTheDocument();
    });
  });

  describe("Recipe Footer", () => {
    test("should render recipe footer component", () => {
      renderDetailPost();
      expect(screen.getByTestId("recipe-footer")).toBeInTheDocument();
    });
  });

  describe("Responsive Layout", () => {
    test("should render improvement details section", () => {
      renderDetailPost();
      expect(screen.getByText("詳細な改善手順")).toBeInTheDocument();
    });

    test("should render comparison section", () => {
      renderDetailPost();
      expect(screen.getByText("改善前後の比較")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    test("should handle missing data gracefully", () => {
      const incompleteData = {
        ...mockData,
        situationBeforeImprovement: "",
        situationAfterImprovement: "",
        improvementProcedures: "",
      };

      expect(() => renderDetailPost({ data: incompleteData, isStart: true })).not.toThrow();
    });
  });
});
