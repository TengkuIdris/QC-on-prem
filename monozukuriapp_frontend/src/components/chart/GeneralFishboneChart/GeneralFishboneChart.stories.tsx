import React, { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import GeneralChartFishBone from "./index";
import { fireEvent, within } from "@storybook/testing-library";

const getElementsFishboneChart = (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const generateButton = canvas.getByText("特性要因図に反映");
  const downloadButton = canvas.getByText("特性要因図の保存");
  const saveButton = canvas.getByText("入力データの保存");
  const imageExtensionSelect = canvas.getByText("画像の拡張子を選択");
  const fontSelect = canvas.getByText("MS ゴシック");
  return { generateButton, downloadButton, saveButton, imageExtensionSelect, fontSelect };
};

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

const FishboneChartWrapper = () => {
  return (
    <Provider store={mockStore}>
      <BrowserRouter>
        <GeneralChartFishBone />
        <ToastContainer />
      </BrowserRouter>
    </Provider>
  );
};

const meta = {
  title: "Components/Chart/FishboneChart",
  component: FishboneChartWrapper,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: ComponentType) => (
      <div style={{ height: "100vh", backgroundColor: "#f5f5f5" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof FishboneChartWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const GenerateChart: Story = {
  play: async ({ canvasElement }) => {
    const { generateButton } = getElementsFishboneChart(canvasElement);
    fireEvent.click(generateButton);
  },
};

export const DownloadWithoutGenerate: Story = {
  play: async ({ canvasElement }) => {
    const { downloadButton } = getElementsFishboneChart(canvasElement);
    fireEvent.click(downloadButton);
  },
};

export const SaveWithoutGenerate: Story = {
  play: async ({ canvasElement }) => {
    const { saveButton } = getElementsFishboneChart(canvasElement);
    fireEvent.click(saveButton);
  },
};

export const WithDisabledSave: Story = {
  parameters: {
    mockData: {
      auth: {
        user: {
          role: {
            FISHBONE_SAVE_TYPED_DATA: false,
          },
        },
      },
    },
  },
};

export const WithTreeData: Story = {
  parameters: {
    mockData: {
      tree: {
        rootNode: {
          id: 1,
          name: "Root Node",
          level: 0,
          children: [
            {
              id: 2,
              name: "Child 1",
              level: 1,
              children: [],
            },
            {
              id: 3,
              name: "Child 2",
              level: 1,
              children: [],
            },
          ],
        },
      },
    },
  },
};

export const WithFontSelection: Story = {
  play: async ({ canvasElement }) => {
    const { fontSelect } = getElementsFishboneChart(canvasElement);
    fireEvent.mouseDown(fontSelect);
    const option = within(canvasElement).getByText("Arial");
    fireEvent.click(option);
  },
};

export const WithImageExtensionSelection: Story = {
  play: async ({ canvasElement }) => {
    const { imageExtensionSelect } = getElementsFishboneChart(canvasElement);
    fireEvent.mouseDown(imageExtensionSelect);
    const option = within(canvasElement).getByText("PNG");
    fireEvent.click(option);
  },
};

export const WithFontSizeSelection: Story = {
  play: async ({ canvasElement }) => {
    const rootFontSize = within(canvasElement).getByText("ロートフォントサイズ");
    fireEvent.mouseDown(rootFontSize);
    const option = within(canvasElement).getByText("16px");
    fireEvent.click(option);
  },
};

export const WithUnsavedChanges: Story = {
  play: async ({ canvasElement }) => {
    const { generateButton } = getElementsFishboneChart(canvasElement);
    fireEvent.click(generateButton);
    window.dispatchEvent(new PopStateEvent("popstate"));
  },
};

export const WithZoomControls: Story = {
  play: async ({ canvasElement }) => {
    const zoomInButton = within(canvasElement).getByTestId("zoom-in-button");
    const zoomOutButton = within(canvasElement).getByTestId("zoom-out-button");
    const resetButton = within(canvasElement).getByTestId("reset-zoom-button");

    fireEvent.click(zoomInButton);
    fireEvent.click(zoomOutButton);
    fireEvent.click(resetButton);
  },
};
