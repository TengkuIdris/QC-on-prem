import React, { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import GeneralChart from "./index";
import { fireEvent, within } from "@storybook/testing-library";

const getElementsGeneralChart = (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const generateButton = canvas.getByText("FTA図に反映");
  const downloadButton = canvas.getByText("FTA図の保存");
  const saveButton = canvas.getByText("入力データの保存");
  const imageExtensionSelect = canvas.getByTestId("image-extension-select");
  const fontSelect = canvas.getByTestId("font-select");
  return { generateButton, downloadButton, saveButton, imageExtensionSelect, fontSelect };
};

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

const GeneralChartWrapper = () => {
  return (
    <Provider store={mockStore}>
      <BrowserRouter>
        <GeneralChart />
        <ToastContainer />
      </BrowserRouter>
    </Provider>
  );
};

const meta = {
  title: "Components/Chart/GeneralChart",
  component: GeneralChartWrapper,
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
} satisfies Meta<typeof GeneralChartWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const GenerateChart: Story = {
  play: async ({ canvasElement }) => {
    const { generateButton } = getElementsGeneralChart(canvasElement);
    fireEvent.click(generateButton);
  },
};

export const DownloadWithoutGenerate: Story = {
  play: async ({ canvasElement }) => {
    const { downloadButton } = getElementsGeneralChart(canvasElement);
    fireEvent.click(downloadButton);
  },
};

export const SaveWithoutGenerate: Story = {
  play: async ({ canvasElement }) => {
    const { saveButton } = getElementsGeneralChart(canvasElement);
    fireEvent.click(saveButton);
  },
};

export const WithDisabledSave: Story = {
  parameters: {
    mockData: {
      auth: {
        user: {
          role: {
            FTA_SAVE_TYPED_DATA: false,
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

export const WithOpenChat: Story = {
  play: async ({ canvasElement }) => {
    const chatToggleButton = within(canvasElement).getByTestId("chat-toggle-button");
    fireEvent.click(chatToggleButton);
  },
};

export const WithOpenDiagram: Story = {
  play: async ({ canvasElement }) => {
    const diagramToggleButton = within(canvasElement).getByTestId("diagram-toggle-button");
    fireEvent.click(diagramToggleButton);
  },
};

export const WithFontSelection: Story = {
  play: async ({ canvasElement }) => {
    const { fontSelect } = getElementsGeneralChart(canvasElement);
    fireEvent.mouseDown(fontSelect);
    const option = within(canvasElement).getByText("MS ゴシック");
    fireEvent.click(option);
  },
};

export const WithImageExtensionSelection: Story = {
  play: async ({ canvasElement }) => {
    const { imageExtensionSelect } = getElementsGeneralChart(canvasElement);
    fireEvent.mouseDown(imageExtensionSelect);
    const option = within(canvasElement).getByText("PNG");
    fireEvent.click(option);
  },
};
