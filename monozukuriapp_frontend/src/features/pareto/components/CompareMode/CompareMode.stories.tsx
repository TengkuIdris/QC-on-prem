import React, { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CompareMode from "./index";
import { fireEvent, within } from "@storybook/testing-library";

const mockStore = configureStore({
  reducer: {
    auth: (
      state = {
        user: { role: { PARENTO_SAVE_TYPED_DATA: true, PARENTO_SAVE_AS_CSV: true, PARENTO_CHOOSE_FONT_TEXT: true } },
      },
    ) => state,
    checkSaveDataSlice: (state = { pareto: false }) => state,
  },
});

const getElementsCompareMode = (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const beforeAfterSwitch = canvas.getByLabelText("Before/After mode");
  const generateButton = canvas.getByText("比較グラフを生成");
  const uploadBothButton = canvas.getByText("両方アップロード");
  return { beforeAfterSwitch, generateButton, uploadBothButton };
};

const CompareModeWrapper = () => {
  return (
    <Provider store={mockStore}>
      <BrowserRouter>
        <CompareMode />
        <ToastContainer />
      </BrowserRouter>
    </Provider>
  );
};

const meta = {
  title: "Pareto/CompareMode",
  component: CompareModeWrapper,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story: ComponentType) => (
      <div style={{ width: "1200px", padding: "20px", backgroundColor: "white" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof CompareModeWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BeforeAfterModeEnabled: Story = {
  play: async ({ canvasElement }) => {
    const { beforeAfterSwitch } = getElementsCompareMode(canvasElement);
    fireEvent.click(beforeAfterSwitch);
  },
};

export const GenerateChartWithoutData: Story = {
  play: async ({ canvasElement }) => {
    const { generateButton } = getElementsCompareMode(canvasElement);
    fireEvent.click(generateButton);
  },
};

export const UploadBothWithoutData: Story = {
  play: async ({ canvasElement }) => {
    const { beforeAfterSwitch, uploadBothButton } = getElementsCompareMode(canvasElement);
    fireEvent.click(beforeAfterSwitch);
    fireEvent.click(uploadBothButton);
  },
};

export const WithSampleData: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const beforeDataInput = canvas.getByTestId("before-data-input");
    fireEvent.change(beforeDataInput, {
      target: {
        value: JSON.stringify([
          { name: "Item 1", quantity: 100 },
          { name: "Item 2", quantity: 75 },
          { name: "Item 3", quantity: 50 },
        ]),
      },
    });

    const { beforeAfterSwitch, generateButton } = getElementsCompareMode(canvasElement);
    fireEvent.click(beforeAfterSwitch);

    const afterDataInput = canvas.getByTestId("after-data-input");
    fireEvent.change(afterDataInput, {
      target: {
        value: JSON.stringify([
          { name: "Item 1", quantity: 80 },
          { name: "Item 2", quantity: 60 },
          { name: "Item 3", quantity: 40 },
        ]),
      },
    });

    fireEvent.click(generateButton);
  },
};

export const InvalidData: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const beforeDataInput = canvas.getByTestId("before-data-input");
    fireEvent.change(beforeDataInput, {
      target: {
        value: JSON.stringify([
          { name: "", quantity: -1 },
          { name: "Item 1", quantity: "invalid" },
        ]),
      },
    });

    const { generateButton } = getElementsCompareMode(canvasElement);
    fireEvent.click(generateButton);
  },
};

export const ChartsGenerated: Story = {
  play: async ({ canvasElement }) => {
    const { beforeAfterSwitch, generateButton } = getElementsCompareMode(canvasElement);

    fireEvent.click(beforeAfterSwitch);

    const canvas = within(canvasElement);
    const beforeDataInput = canvas.getByTestId("before-data-input");
    const afterDataInput = canvas.getByTestId("after-data-input");

    fireEvent.change(beforeDataInput, {
      target: {
        value: JSON.stringify([
          { name: "Item 1", quantity: 100 },
          { name: "Item 2", quantity: 75 },
        ]),
      },
    });

    fireEvent.change(afterDataInput, {
      target: {
        value: JSON.stringify([
          { name: "Item 1", quantity: 80 },
          { name: "Item 2", quantity: 60 },
        ]),
      },
    });

    fireEvent.click(generateButton);
  },
};
