import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import GeneralChartFishBone from "./index";
import "@testing-library/jest-dom";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

jest.mock("../../../features/fta/components/Node", () => {
  return function MockTree() {
    return <div data-testid="tree-component">Tree Mock</div>;
  };
});

jest.mock("../../../features/diagram/FishBoneChart", () => {
  return function MockFishboneChart() {
    return <div data-testid="fishbone-chart">Fishbone Chart Mock</div>;
  };
});

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockStore = configureStore({
  reducer: {
    auth: () => ({
      user: {
        role: {
          FISHBONE_SAVE_TYPED_DATA: true,
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
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>,
  );
};

jest.mock("@mui/icons-material", () => ({
  ZoomIn: () => <div data-testid="zoom-in-icon">Zoom In</div>,
  ZoomOut: () => <div data-testid="zoom-out-icon">Zoom Out</div>,
  Refresh: () => <div data-testid="refresh-icon">Refresh</div>,
}));

jest.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children }: { children: any }) =>
    children({ zoomIn: jest.fn(), zoomOut: jest.fn(), setTransform: jest.fn() }),
  TransformComponent: ({ children }: { children: any }) => <div>{children}</div>,
}));

jest.mock("formik", () => ({
  Formik: ({ children }: any) =>
    children({
      handleSubmit: jest.fn(),
      handleChange: jest.fn(),
      values: {},
      errors: {},
    }),
  Form: ({ children }: any) => <form>{children}</form>,
}));

describe("GeneralChartFishBone Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders main UI elements", () => {
    renderWithProviders(<GeneralChartFishBone />);

    expect(screen.getByText("特性要因図に反映")).toBeInTheDocument();
    expect(screen.getByText("特性要因図の保存")).toBeInTheDocument();
    expect(screen.getByText("入力データの保存")).toBeInTheDocument();
  });

  test("renders select dropdowns", () => {
    renderWithProviders(<GeneralChartFishBone />);

    expect(screen.getByText("画像の拡張子を選択")).toBeInTheDocument();
    expect(screen.getByText("MS ゴシック")).toBeInTheDocument();
  });

  test("renders font size select dropdowns", () => {
    renderWithProviders(<GeneralChartFishBone />);

    expect(screen.getByText("ルートフォントサイズ")).toBeInTheDocument();
    expect(screen.getByText("レベル1フォントサイズ")).toBeInTheDocument();
    expect(screen.getByText("レベル2以降の子ノードフォントサイズ")).toBeInTheDocument();
  });

  test("shows save confirmation dialog when there are unsaved changes", async () => {
    renderWithProviders(<GeneralChartFishBone />);

    const generateButton = screen.getByText("特性要因図に反映");
    fireEvent.click(generateButton);

    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => {
      expect(screen.getByText("変更内容が保存されていない可能性がありますが、よろしいですか？")).toBeInTheDocument();
    });
  });

  test("renders fishbone chart component", () => {
    renderWithProviders(<GeneralChartFishBone />);

    expect(screen.getByTestId("fishbone-chart")).toBeInTheDocument();
  });

  test("renders zoom controls", () => {
    renderWithProviders(<GeneralChartFishBone />);

    const zoomInButton = screen.getByTestId("zoom-in-button");
    const zoomOutButton = screen.getByTestId("zoom-out-button");
    const resetButton = screen.getByTestId("reset-zoom-button");

    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
    expect(resetButton).toBeInTheDocument();
  });

  test("disables download button when chart is not generated", () => {
    renderWithProviders(<GeneralChartFishBone />);

    const downloadButton = screen.getByText("特性要因図の保存");
    expect(downloadButton).toBeEnabled();

    fireEvent.click(downloadButton);
  });

  test("disables save button when user doesn't have permission", () => {
    const storeWithoutPermission = configureStore({
      reducer: {
        auth: () => ({
          user: {
            role: {
              FISHBONE_SAVE_TYPED_DATA: false,
            },
          },
        }),
        checkSaveDataSlice: () => ({
          fishbone: false,
        }),
      },
    });

    render(
      <Provider store={storeWithoutPermission}>
        <BrowserRouter>
          <GeneralChartFishBone />
        </BrowserRouter>
      </Provider>,
    );

    const saveButton = screen.getByText("入力データの保存");
    expect(saveButton).toBeDisabled();
  });
});
