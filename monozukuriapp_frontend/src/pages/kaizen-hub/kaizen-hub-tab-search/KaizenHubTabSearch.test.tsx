import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import KaizenHubTabSearch from "./index";
import { KaizenHubTabInfoContext } from "../kaizen-hub-tab";
import { handleApi } from "@/utils/handleApi";

// Mock dependencies
jest.mock("@/services/apis/kaizenhubService", () => ({
  getImprovementList: jest.fn(),
  getLabelList: jest.fn(),
}));

jest.mock("@/utils/handleApi", () => ({
  handleApi: jest.fn(),
}));

// Mock SearchPage component
jest.mock("@/features/kaizen-hub/search", () => {
  return function MockSearchPage() {
    return <div data-testid="search-page-component">Search Page Content</div>;
  };
});

// Mock Input component
jest.mock("@/components/ui/Input/Input", () => {
  return function MockInput(props: any) {
    return <input {...props} />;
  };
});

// Mock Tab component
jest.mock("@/components/ui/Tab/Tab", () => ({
  TabContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe("KaizenHubTabSearch Component UI", () => {
  const mockContextValue = {
    paramsSearch: {
      search: "",
      selectedTags: [],
      page: 1,
    },
    setParamsSearch: jest.fn(),
  };

  const mockLabelList = {
    data: [{ title: "Tag1" }, { title: "Tag2" }, { title: "Tag3" }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (handleApi as jest.Mock).mockResolvedValue([mockLabelList, null]);
  });

  const renderKaizenHubTabSearch = () => {
    return render(
      <KaizenHubTabInfoContext.Provider value={mockContextValue as any}>
        <KaizenHubTabSearch />
      </KaizenHubTabInfoContext.Provider>,
    );
  };

  describe("Header Section", () => {
    test("renders title and description", () => {
      renderKaizenHubTabSearch();
      expect(screen.getByText("改善レシピを探す")).toBeInTheDocument();
      expect(screen.getByText("キーワードで検索、または人気のタグから選択")).toBeInTheDocument();
    });

    test("renders search input with correct placeholder", () => {
      renderKaizenHubTabSearch();
      const searchInput = screen.getByPlaceholderText("キーワードを入力");
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveClass(
        "w-full",
        "border-2",
        "rounded-lg",
        "p-2",
        "border-gray-300",
        "border-solid",
        "outline-gray-400",
        "bg-white",
      );
    });

    test("renders search button with correct styling", () => {
      renderKaizenHubTabSearch();
      const searchButton = screen.getByRole("button", { name: "検索" });
      expect(searchButton).toBeInTheDocument();
      expect(searchButton).toHaveClass("font-bold", "bg-btn-black", "text-white", "ml-4", "w-24");
    });
  });

  describe("Tags Section", () => {
    test("renders tags section header", () => {
      renderKaizenHubTabSearch();
      const tagsHeader = screen.getByText("人気のタグ");
      expect(tagsHeader).toBeInTheDocument();
      expect(tagsHeader).toHaveClass("text-lg", "font-semibold", "mb-4");
    });

    test("renders tags container", () => {
      renderKaizenHubTabSearch();
      const tagsContainer = screen.getByTestId("tags-container");
      expect(tagsContainer).toBeInTheDocument();
    });
  });

  describe("Card Layout", () => {
    test("renders search form", () => {
      renderKaizenHubTabSearch();
      const form = screen.getByRole("search");
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass("flex", "gap-2");
    });

    test("renders search results component", () => {
      renderKaizenHubTabSearch();
      const searchResults = screen.getByTestId("search-page-component");
      expect(searchResults).toBeInTheDocument();
      expect(searchResults).toHaveTextContent("Search Page Content");
    });
  });

  describe("Layout Structure", () => {
    test("renders card content", () => {
      renderKaizenHubTabSearch();
      const content = screen.getByRole("main");
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass("flex-1", "flex", "flex-col");
    });

    test("renders tab content", () => {
      renderKaizenHubTabSearch();
      const tabContent = screen.getByRole("tabpanel");
      expect(tabContent).toBeInTheDocument();
      expect(tabContent).toHaveClass("p-3", "h-full");
    });
  });
});
