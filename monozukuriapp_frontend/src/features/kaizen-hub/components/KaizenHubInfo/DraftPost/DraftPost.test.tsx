import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import DraftPost from "./index";
import { BrowserRouter } from "react-router-dom";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { handleApi } from "@/utils/handleApi";

jest.mock("@/services/apis/kaizenhubService", () => ({
  getListDraft: jest.fn(),
}));

jest.mock("@/utils/handleApi", () => ({
  handleApi: jest.fn(),
}));

const mockDraftPosts = {
  data: {
    data: [
      {
        id: 1,
        title: "Draft Post 1",
        description: "Description 1",
        createdAt: "2024-03-20",
      },
      {
        id: 2,
        title: "Draft Post 2",
        description: "Description 2",
        createdAt: "2024-03-21",
      },
    ],
  },
};

describe("DraftPost", () => {
  const renderDraftPost = () => {
    return render(
      <BrowserRouter>
        <DraftPost />
      </BrowserRouter>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (handleApi as jest.Mock).mockResolvedValue([mockDraftPosts, null]);
  });

  test("renders loading state initially", () => {
    renderDraftPost();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("renders draft posts after loading", async () => {
    renderDraftPost();

    await screen.findByText("Draft Post 1");
    await screen.findByText("Draft Post 2");

    expect(screen.getByText("Draft Post 1")).toBeInTheDocument();
    expect(screen.getByText("Draft Post 2")).toBeInTheDocument();
  });

  test("renders no data message when there are no drafts", async () => {
    (handleApi as jest.Mock).mockResolvedValue([{ data: { data: [] } }, null]);
    renderDraftPost();

    await screen.findByText("データがありません");
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("handles scroll and loads more data", async () => {
    renderDraftPost();

    await screen.findByText("Draft Post 1");

    const stackElement = screen.getByTestId("draft-post-stack");

    Object.defineProperty(stackElement, "scrollHeight", { value: 1000 });
    Object.defineProperty(stackElement, "scrollTop", { value: 850 });
    Object.defineProperty(stackElement, "clientHeight", { value: 100 });

    await act(async () => {
      fireEvent.scroll(stackElement);
    });

    expect(handleApi).toHaveBeenCalledWith(kaiZenHubService.getListDraft({ isDraft: true, page: 2, size: 10 }));
  });

  test("handles API error gracefully", async () => {
    (handleApi as jest.Mock).mockResolvedValue([null, new Error("API Error")]);
    renderDraftPost();

    await screen.findByText("データがありません");
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("stops loading more when no more data", async () => {
    (handleApi as jest.Mock).mockResolvedValueOnce([
      {
        data: {
          data: [
            {
              id: 1,
              title: "Last Draft Post",
              description: "Last Description",
              createdAt: "2024-03-20",
            },
          ],
        },
      },
      null,
    ]);

    renderDraftPost();
    await screen.findByText("Last Draft Post");

    const stackElement = screen.getByTestId("draft-post-stack");

    await act(async () => {
      fireEvent.scroll(stackElement);
    });

    expect(handleApi).toHaveBeenCalledTimes(1);
  });
});
