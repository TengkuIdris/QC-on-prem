import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import RecipeFooter, { RecipeFooterProps } from "./index";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { toast } from "react-toastify";
import copy from "copy-to-clipboard";

// Mock dependencies
jest.mock("@/services/apis/kaizenhubService", () => ({
  likeImprovement: jest.fn(),
  reviewlist: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("copy-to-clipboard", () => jest.fn());

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: "123" }),
}));

describe("RecipeFooter", () => {
  const renderRecipeFooter = (props?: RecipeFooterProps) => {
    return render(
      <BrowserRouter>
        <RecipeFooter {...props} />
      </BrowserRouter>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (kaiZenHubService.reviewlist as jest.Mock).mockResolvedValue({
      data: {
        data: [],
        count: 0,
        totalPage: 1,
      },
    });
  });

  describe("Button Interactions", () => {
    test("should render all action buttons", () => {
      renderRecipeFooter();

      expect(screen.getByText(/いいね！/)).toBeInTheDocument();
      expect(screen.getByText(/コメント/)).toBeInTheDocument();
      expect(screen.getByText("レシピをレビュー")).toBeInTheDocument();
      expect(screen.getByText("レシピをクリップボードにコピーする")).toBeInTheDocument();
    });

    test("should handle like error", async () => {
      (kaiZenHubService.likeImprovement as jest.Mock).mockRejectedValueOnce(new Error());

      renderRecipeFooter();

      const likeButton = screen.getByText(/いいね！/);
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("いいねに失敗しました");
      });
    });

    test("should copy URL to clipboard", () => {
      renderRecipeFooter();

      const copyButton = screen.getByText("レシピをクリップボードにコピーする");
      fireEvent.click(copyButton);

      expect(copy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("URLをクリップボードにコピーしました");
    });

    test("should handle copy URL error", () => {
      (copy as jest.Mock).mockImplementationOnce(() => {
        throw new Error();
      });

      renderRecipeFooter();

      const copyButton = screen.getByText("レシピをクリップボードにコピーする");
      fireEvent.click(copyButton);

      expect(toast.error).toHaveBeenCalledWith("URLをクリップボードにコピーに失敗しました");
    });
  });

  describe("Review Section", () => {
    test("should show loading state while fetching reviews", async () => {
      (kaiZenHubService.reviewlist as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      renderRecipeFooter();

      const commentButton = screen.getByText(/コメント/);
      fireEvent.click(commentButton);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
  });
});
