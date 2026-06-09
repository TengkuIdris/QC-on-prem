import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import KaizenHubTabInfo from "./index";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { KaizenHubTabInfoContext } from "../kaizen-hub-tab";

jest.mock("@/features/settings/components/MyPage", () => {
  return function MockMyPage() {
    return <div data-testid="my-page">My Page Content</div>;
  };
});

jest.mock("@/features/kaizen-hub/components/KaizenHubInfo/PostHistory", () => {
  return function MockPostHistory() {
    return <div data-testid="post-history">Post History Content</div>;
  };
});

jest.mock("@/features/kaizen-hub/components/KaizenHubInfo/Favorite", () => {
  return function MockFavorite() {
    return <div data-testid="favorite">Favorite Content</div>;
  };
});

jest.mock("@/features/kaizen-hub/components/KaizenHubInfo/DraftPost", () => {
  return function MockDraftPost() {
    return <div data-testid="draft-post">Draft Post Content</div>;
  };
});

const createMockStore = (hasPermission = true) =>
  configureStore({
    reducer: {
      auth: () => ({
        user: {
          role: {
            KAIZENHUB_POST_AND_VIEW: hasPermission,
          },
        },
      }),
    },
  });

describe("KaizenHubTabInfo Component UI", () => {
  const mockContextValue = {
    kaizenHubTabInfo: 0,
    setKaizenHubTabInfo: jest.fn(),
    paramsSearch: {
      search: "",
      selectedTags: [],
      page: 1,
    },
    setParamsSearch: jest.fn(),
  };

  const renderTabInfo = (hasPermission = true) => {
    const mockStore = createMockStore(hasPermission);
    return render(
      <Provider store={mockStore}>
        <KaizenHubTabInfoContext.Provider value={mockContextValue}>
          <KaizenHubTabInfo />
        </KaizenHubTabInfoContext.Provider>
      </Provider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Layout Structure", () => {
    test("should render Paper component with correct styles", () => {
      renderTabInfo();
      const paper = screen.getByTestId("tab-info-paper");
      expect(paper).toBeInTheDocument();
      expect(paper).toHaveStyle({
        borderRadius: "8px",
        padding: "16px",
      });
    });

    test("should render content container with correct styles", () => {
      renderTabInfo();
      const contentBox = screen.getByTestId("content-container");
      expect(contentBox).toBeInTheDocument();
      expect(contentBox).toHaveStyle({
        border: "1px solid #e0e0e0",
        borderRadius: "0 0 8px 8px",
      });
    });
  });

  describe("Tabs Section", () => {
    test("should render all tab labels", () => {
      renderTabInfo();

      expect(screen.getByRole("tab", { name: "ユーザー情報" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "投稿履歴" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "お気に入り" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "下書き保存" })).toBeInTheDocument();
    });

    test("should apply active tab styles", () => {
      renderTabInfo();
      const activeTab = screen.getByRole("tab", { selected: true });
      expect(activeTab).toHaveAttribute("aria-selected", "true");
    });

    test("should disable post history tab when user lacks permission", () => {
      const mockStore = configureStore({
        reducer: {
          auth: () => ({
            user: {
              role: {
                KAIZENHUB_POST_AND_VIEW: false,
              },
            },
          }),
        },
      });

      render(
        <Provider store={mockStore}>
          <KaizenHubTabInfoContext.Provider value={mockContextValue}>
            <KaizenHubTabInfo />
          </KaizenHubTabInfoContext.Provider>
        </Provider>,
      );

      const tabs = screen.getAllByRole("tab");
      const postHistoryTab = tabs[1];

      expect(postHistoryTab).toBeDisabled();
    });
  });

  describe("Content Display", () => {
    test("should render user info content by default", () => {
      renderTabInfo();
      expect(screen.getByTestId("my-page")).toBeInTheDocument();
    });

    test("should switch content when clicking tabs", () => {
      renderTabInfo();

      const postHistoryTab = screen.getByRole("tab", { name: "投稿履歴" });
      fireEvent.click(postHistoryTab);
      expect(mockContextValue.setKaizenHubTabInfo).toHaveBeenCalledWith(1);

      const favoriteTab = screen.getByRole("tab", { name: "お気に入り" });
      fireEvent.click(favoriteTab);
      expect(mockContextValue.setKaizenHubTabInfo).toHaveBeenCalledWith(2);

      const draftTab = screen.getByRole("tab", { name: "下書き保存" });
      fireEvent.click(draftTab);
      expect(mockContextValue.setKaizenHubTabInfo).toHaveBeenCalledWith(3);
    });
  });
});
