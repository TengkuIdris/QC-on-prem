import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import PostHistory from "./index";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import eventEmitter from "@/utils/eventEmitter";
import { TableType } from "@/enum";

jest.mock("@/services/apis/kaizenhubService", () => ({
  getMyImprovement: jest.fn(),
}));

jest.mock("@/utils/eventEmitter", () => ({
  emit: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
}));

const mockPostData = {
  data: {
    data: [
      {
        id: 1,
        title: "Test Post 1",
        description: "Test Description 1",
        createdAt: "2024-03-20",
        _count: {
          likes: 10,
        },
        averageRating: 4.5,
      },
      {
        id: 2,
        title: "Test Post 2",
        description: "Test Description 2",
        createdAt: "2024-03-21",
        _count: {
          likes: 5,
        },
        averageRating: 3.5,
      },
    ],
  },
};

describe("PostHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (kaiZenHubService.getMyImprovement as jest.Mock).mockResolvedValue(mockPostData);
  });

  const renderPostHistory = () => {
    return render(
      <BrowserRouter>
        <PostHistory />
      </BrowserRouter>,
    );
  };

  test("renders sort dropdown", async () => {
    renderPostHistory();

    expect(screen.getByLabelText("並び替え")).toBeInTheDocument();
  });

  test("renders all sorting options", () => {
    renderPostHistory();

    fireEvent.mouseDown(screen.getByLabelText("並び替え"));

    expect(screen.getByText("投稿日")).toBeInTheDocument();
    expect(screen.getByText("いいね数")).toBeInTheDocument();
    expect(screen.getByText("閲覧数")).toBeInTheDocument();
  });

  test("handles sort selection change", async () => {
    renderPostHistory();

    fireEvent.mouseDown(screen.getByLabelText("並び替え"));

    fireEvent.click(screen.getByText("いいね数"));

    await waitFor(() => {
      expect(eventEmitter.emit).toHaveBeenCalledWith(TableType.SEARCH_POST_HISTORY, {
        typeList: "Like",
      });
    });
  });

  test("handles API error gracefully", async () => {
    (kaiZenHubService.getMyImprovement as jest.Mock).mockRejectedValue(new Error("API Error"));
    renderPostHistory();

    await waitFor(() => {
      expect(kaiZenHubService.getMyImprovement).toHaveBeenCalled();
    });
  });

  test("sort form control has correct width", () => {
    renderPostHistory();
    const formControl = screen.getByTestId("sort-form-control");
    expect(formControl).toHaveStyle({ width: "160px" });
  });
});
