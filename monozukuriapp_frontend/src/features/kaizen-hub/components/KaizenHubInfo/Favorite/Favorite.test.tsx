import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import Favorite from "./index";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import eventEmitter from "@/utils/eventEmitter";
import { TableType } from "@/enum";

jest.mock("@/services/apis/kaizenhubService", () => ({
  getListMyFavoriteImproments: jest.fn(),
}));

jest.mock("@/utils/eventEmitter", () => ({
  emit: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
}));

const mockFavoriteData = {
  data: {
    data: [
      {
        id: 1,
        title: "Test Title 1",
        description: "Test Description 1",
        createdAt: "2024-03-20",
      },
      {
        id: 2,
        title: "Test Title 2",
        description: "Test Description 2",
        createdAt: "2024-03-21",
      },
    ],
  },
};

describe("Favorite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (kaiZenHubService.getListMyFavoriteImproments as jest.Mock).mockResolvedValue(mockFavoriteData);
  });

  const renderFavorite = () => {
    return render(
      <BrowserRouter>
        <Favorite />
      </BrowserRouter>,
    );
  };

  test("renders sort dropdown", async () => {
    renderFavorite();

    expect(screen.getByLabelText("並び替え")).toBeInTheDocument();
  });

  test("renders all sorting options", () => {
    renderFavorite();

    fireEvent.mouseDown(screen.getByLabelText("並び替え"));

    expect(screen.getByText("投稿日")).toBeInTheDocument();
    expect(screen.getByText("いいね数")).toBeInTheDocument();
    expect(screen.getByText("閲覧数")).toBeInTheDocument();
  });

  test("handles sort selection change", async () => {
    renderFavorite();

    fireEvent.mouseDown(screen.getByLabelText("並び替え"));

    fireEvent.click(screen.getByText("いいね数"));

    await waitFor(() => {
      expect(eventEmitter.emit).toHaveBeenCalledWith(TableType.LIST_FAVORITE, {
        typeList: "Like",
      });
    });
  });

  test("handles API error gracefully", async () => {
    (kaiZenHubService.getListMyFavoriteImproments as jest.Mock).mockRejectedValue(new Error("API Error"));
    renderFavorite();

    await waitFor(() => {
      expect(kaiZenHubService.getListMyFavoriteImproments).toHaveBeenCalled();
    });
  });

  test("sort form control has correct width", () => {
    renderFavorite();
    const formControl = screen.getByTestId("sort-form-control");
    expect(formControl).toHaveStyle({ width: "160px" });
  });
});
