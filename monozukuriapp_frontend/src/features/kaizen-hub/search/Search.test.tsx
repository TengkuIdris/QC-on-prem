import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Search, { SearchProps } from "./index";
import { BrowserRouter } from "react-router-dom";
import { IImprovement } from "@/interfaces";

// Mock PostInfo component
jest.mock("../components/PostInfo", () => {
  return function MockPostInfo({ title, postDate, desc }: any) {
    return (
      <div data-testid="post-info">
        <div>{title}</div>
        <div>{postDate}</div>
        <div>{desc}</div>
      </div>
    );
  };
});

describe("Search Component", () => {
  const mockData = [
    {
      id: 1,
      title: "Test Title 1",
      description: "Test Description 1",
      createdAt: "2024-03-20T10:00:00Z",
    },
    {
      id: 2,
      title: "Test Title 2",
      description: "Test Description 2",
      createdAt: "2024-03-21T10:00:00Z",
    },
  ];

  const defaultProps: SearchProps = {
    data: mockData as IImprovement[],
    isLoading: false,
    hasMore: true,
    handleLoadMore: jest.fn(),
  };

  const renderSearch = (props: SearchProps = defaultProps) => {
    return render(
      <BrowserRouter>
        <Search {...props} />
      </BrowserRouter>,
    );
  };

  describe("Header and Title", () => {
    test("should render search results title", () => {
      renderSearch();
      expect(screen.getByText("検索結果の表示エリア")).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    test("should show loading spinner when isLoading is true", () => {
      renderSearch({ ...defaultProps, isLoading: true });
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    test("should not show loading spinner when isLoading is false", () => {
      renderSearch({ ...defaultProps, isLoading: false });
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  describe("Data Display", () => {
    test("should render no data message when data is empty", () => {
      renderSearch({ ...defaultProps, data: [] });
      expect(screen.getByText("データがありません")).toBeInTheDocument();
      expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("src", "/image/no_data.svg");
    });

    test("should render post items when data exists", () => {
      renderSearch();
      const postItems = screen.getAllByTestId("post-info");
      expect(postItems).toHaveLength(2);

      expect(screen.getByText("Test Title 1")).toBeInTheDocument();
      expect(screen.getByText("Test Title 2")).toBeInTheDocument();
    });

    test("should format dates correctly", () => {
      renderSearch();
      expect(screen.getByText("2024/03/20")).toBeInTheDocument();
      expect(screen.getByText("2024/03/21")).toBeInTheDocument();
    });
  });

  describe("Infinite Scroll", () => {
    const mockScrollEvent = (element: HTMLElement) => {
      Object.defineProperty(element, "scrollTop", {
        configurable: true,
        value: 450,
      });
      Object.defineProperty(element, "clientHeight", {
        configurable: true,
        value: 500,
      });
      Object.defineProperty(element, "scrollHeight", {
        configurable: true,
        value: 1000,
      });

      fireEvent.scroll(element);
    };

    test("should call handleLoadMore when scrolled near bottom", async () => {
      renderSearch();
      const scrollContainer = screen.getByTestId("scroll-container");

      mockScrollEvent(scrollContainer);

      await waitFor(() => {
        expect(defaultProps.handleLoadMore).toHaveBeenCalled();
      });
    });
  });
});
