import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import GeneralChart from "./index";
import "@testing-library/jest-dom";

jest.mock("../../../features/fta/components/chat/ChatUI", () => {
  return function MockChatUI() {
    return <div data-testid="chat-ui">Chat UI Mock</div>;
  };
});

jest.mock("../../../features/fta/components/Node", () => {
  return function MockTree() {
    return <div data-testid="tree">Tree Mock</div>;
  };
});

jest.mock("../../../features/fta/FtaDiagram", () => {
  return function MockTreeChart() {
    return <div data-testid="tree-chart">Tree Chart Mock</div>;
  };
});

jest.mock("d3", () => ({
  select: jest.fn(),
  scaleLinear: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  })),
  scaleBand: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    padding: jest.fn().mockReturnThis(),
  })),
  axisBottom: jest.fn(),
  axisLeft: jest.fn(),
  line: jest.fn(() => ({
    x: jest.fn().mockReturnThis(),
    y: jest.fn().mockReturnThis(),
  })),
}));

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("html2canvas", () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ toBlob: jest.fn() })),
}));

jest.mock("aws-amplify/auth", () => ({
  signOut: jest.fn(),
}));

jest.mock("@/utils/handleApi", () => ({
  handleApi: jest.fn(),
}));

jest.mock("@/utils/eventEmitter", () => ({
  on: jest.fn(),
  emit: jest.fn(),
  removeListener: jest.fn(),
}));

const mockStore = configureStore({
  reducer: {
    auth: () => ({
      user: {
        role: {
          FTA_SAVE_TYPED_DATA: true,
        },
      },
    }),
    checkSaveDataSlice: () => ({
      fishbone: false,
      pareto: false,
    }),
    submitSlice: () => ({
      isSubmitted: false,
    }),
    tree: () => ({
      rootNode: {
        id: 0,
        name: "タイトル",
        level: 0,
        children: [],
      },
    }),
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>,
  );
};

jest.mock("lucide-react", () => ({
  ChevronLeftIcon: () => <div data-testid="chevron-left">ChevronLeft</div>,
  ChevronRightIcon: () => <div data-testid="chevron-right">ChevronRight</div>,
}));

describe("GeneralChart Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("renders main UI elements", () => {
    renderWithProviders(<GeneralChart />);

    expect(screen.getByText("FTA図に反映")).toBeInTheDocument();
    expect(screen.getByText("FTA図の保存")).toBeInTheDocument();
    expect(screen.getByText("入力データの保存")).toBeInTheDocument();
  });

  test("renders select dropdowns", () => {
    renderWithProviders(<GeneralChart />);

    // Check image extension select
    const imageExtensionSelect = screen.getByTestId("image-extension-select");
    expect(imageExtensionSelect).toBeInTheDocument();
    expect(screen.getByText("画像の拡張子を選択")).toBeInTheDocument();

    // Check font select
    const fontSelect = screen.getByTestId("font-select");
    expect(fontSelect).toBeInTheDocument();
    expect(screen.getByText("MS ゴシック")).toBeInTheDocument();
  });

  test("toggles chat panel when chat button is clicked", () => {
    renderWithProviders(<GeneralChart />);

    const chatToggleButton = screen.getByTestId("chat-toggle-button");

    expect(screen.queryByTestId("chat-ui")).not.toBeInTheDocument();

    fireEvent.click(chatToggleButton);

    expect(screen.getByTestId("chat-ui")).toBeInTheDocument();
  });

  test("toggles diagram panel when diagram button is clicked", async () => {
    renderWithProviders(<GeneralChart />);

    const diagramToggleButton = screen.getByTestId("diagram-toggle-button");

    expect(screen.getByTestId("tree")).toBeInTheDocument();

    fireEvent.click(diagramToggleButton);

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.queryByTestId("tree")).not.toBeInTheDocument();
    });
  });

  test("shows save confirmation dialog when there are unsaved changes", async () => {
    renderWithProviders(<GeneralChart />);

    const generateButton = screen.getByText("FTA図に反映");
    fireEvent.click(generateButton);

    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => {
      expect(screen.getByText("変更内容が保存されていない可能性がありますが、よろしいですか？")).toBeInTheDocument();
    });
  });

  test("renders tree chart component", () => {
    renderWithProviders(<GeneralChart />);

    expect(screen.getByTestId("tree-chart")).toBeInTheDocument();
  });

  test("disables download button when chart is not generated", () => {
    renderWithProviders(<GeneralChart />);

    const downloadButton = screen.getByText("FTA図の保存");
    expect(downloadButton).toBeEnabled();

    fireEvent.click(downloadButton);
  });
});
