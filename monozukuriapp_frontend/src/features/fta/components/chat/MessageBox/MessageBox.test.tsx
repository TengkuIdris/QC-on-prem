import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import MessageBox from "./index";
import chatService from "@/services/apis/chatService";

// Mock chatService
jest.mock("@/services/apis/chatService", () => ({
  getListMessage: jest.fn(),
}));

// Mock LoadMoreMessages component
jest.mock("../LoadMoreMessage", () => {
  return function MockLoadMoreMessages({ loadMore, id }: any) {
    return (
      <div data-testid="load-more-messages">
        <button onClick={() => loadMore && loadMore({ page: 1 })}>Load More</button>
        <span>ID: {id || "null"}</span>
      </div>
    );
  };
});

// Mock RealTimeMessages component
jest.mock("../RealTimeMessage", () => {
  return function MockRealTimeMessages({ id }: any) {
    return (
      <div data-testid="real-time-messages">
        <span>Real Time ID: {id || "null"}</span>
      </div>
    );
  };
});

describe("MessageBox Component", () => {
  const defaultProps = {
    setDisableButton: jest.fn(),
    setQueryIds: jest.fn(),
    open: true,
  };

  const renderWithRouter = (props = defaultProps, searchParams = "?id=123") => {
    window.history.pushState({}, "Test page", searchParams);
    return render(
      <BrowserRouter>
        <MessageBox {...props} />
      </BrowserRouter>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset URL between tests
    window.history.pushState({}, "", "/");
  });

  test("renders both message components", () => {
    renderWithRouter();
    expect(screen.getByTestId("load-more-messages")).toBeInTheDocument();
    expect(screen.getByTestId("real-time-messages")).toBeInTheDocument();
  });

  test("passes correct props to LoadMoreMessages", () => {
    renderWithRouter();
    expect(screen.getByText("ID: 123")).toBeInTheDocument();
  });

  test("passes correct props to RealTimeMessages", () => {
    renderWithRouter();
    expect(screen.getByText("Real Time ID: 123")).toBeInTheDocument();
  });

  test("handles missing id in URL", () => {
    renderWithRouter(defaultProps, "");
    expect(screen.getByText("ID: null")).toBeInTheDocument();
    expect(screen.getByText("Real Time ID: null")).toBeInTheDocument();
  });

  test("calls chatService when loadMore is triggered with id", async () => {
    (chatService.getListMessage as jest.Mock).mockResolvedValue({ data: [] });
    renderWithRouter(defaultProps, "?id=123");

    const loadMoreButton = screen.getByText("Load More");
    await loadMoreButton.click();

    expect(chatService.getListMessage).toHaveBeenCalledWith("123", { page: 1 });
  });

  test("does not call chatService when id is missing", async () => {
    renderWithRouter(defaultProps, "");
    (chatService.getListMessage as jest.Mock).mockClear();

    const loadMoreButton = screen.getByText("Load More");
    await loadMoreButton.click();

    expect(chatService.getListMessage).not.toHaveBeenCalled();
  });

  test("passes setDisableButton to child components", () => {
    renderWithRouter();
    expect(screen.getAllByTestId(/messages/)).toHaveLength(2);
  });

  test("passes setQueryIds to child components", () => {
    renderWithRouter();
    expect(screen.getAllByTestId(/messages/)).toHaveLength(2);
  });
});
