import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import KaizenHubDetailPost from "./index";
import { BrowserRouter } from "react-router-dom";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { handleApi } from "@/utils/handleApi";
import { TypeImprovement } from "@/enum/kaizenhub/typeImprovement";

// Mock dependencies
jest.mock("@/services/apis/kaizenhubService", () => ({
  getImprovementDetail: jest.fn(),
}));

jest.mock("@/utils/handleApi", () => ({
  handleApi: jest.fn(),
}));

// Mock DetailPost component
jest.mock("./components/DetailPost", () => {
  return {
    __esModule: true,
    default: ({ data }: any) => <div data-testid="detail-post">{data.title}</div>,
  };
});

const mockData = {
  id: 1,
  title: "Test Recipe",
  createdAt: "2024-03-20T10:00:00Z",
  user: {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    password: "password",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  isFavorite: false,
  beforeImage: "before.jpg",
  afterImage: "after.jpg",
  situationBeforeImprovement: "Before situation",
  situationAfterImprovement: "After situation",
  labels: [],
  tipsAndTricks: "Test tips",
  improvementProcedures: "Test procedures",
  userId: 1,
  description: "Test description",
  type: TypeImprovement.FIVES,
  updatedAt: "2024-03-20T10:00:00Z",
  isLike: false,
  _count: {
    likes: 0,
  },
};

// Mock useParams and useLocation
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ id: "1" }),
  useLocation: () => ({ state: { isView: true } }),
}));

describe("KaizenHubDetailPost Component", () => {
  const renderKaizenHubDetailPost = () => {
    return render(
      <BrowserRouter>
        <KaizenHubDetailPost />
      </BrowserRouter>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    test("should show loading spinner initially", () => {
      (handleApi as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
      renderKaizenHubDetailPost();

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    test("should hide loading spinner after data is loaded", async () => {
      (handleApi as jest.Mock).mockResolvedValueOnce([{ data: mockData }]);
      renderKaizenHubDetailPost();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });
    });
  });

  describe("Data Fetching", () => {
    test("should call getImprovementDetail with correct params", async () => {
      (handleApi as jest.Mock).mockResolvedValueOnce([{ data: mockData }]);
      renderKaizenHubDetailPost();

      await waitFor(() => {
        expect(kaiZenHubService.getImprovementDetail).toHaveBeenCalledWith(1, { isViewed: true });
      });
    });

    test("should render DetailPost component when data is loaded", async () => {
      (handleApi as jest.Mock).mockResolvedValueOnce([{ data: mockData }]);
      renderKaizenHubDetailPost();

      await waitFor(() => {
        expect(screen.getByTestId("detail-post")).toBeInTheDocument();
        expect(screen.getByText("Test Recipe")).toBeInTheDocument();
      });
    });

    test("should handle empty response", async () => {
      (handleApi as jest.Mock).mockResolvedValueOnce([{ data: null }]);
      renderKaizenHubDetailPost();

      await waitFor(() => {
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
      });
    });
  });

  describe("Layout Elements", () => {
    test("should render Paper component with correct styles", async () => {
      (handleApi as jest.Mock).mockResolvedValueOnce([{ data: mockData }]);
      renderKaizenHubDetailPost();

      const paper = await screen.findByRole("article");
      expect(paper).toHaveClass("MuiPaper-elevation4");
      expect(paper).toHaveStyle({ borderRadius: "8px" });
    });

    test("should render user comments section header", async () => {
      (handleApi as jest.Mock).mockResolvedValueOnce([{ data: mockData }]);
      renderKaizenHubDetailPost();

      await waitFor(() => {
        expect(screen.getByText("ユーザーコメント")).toBeInTheDocument();
      });
    });
  });
});
