import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import HomePage from "./HomePage";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

// Mock store
const mockStore = configureStore({
  reducer: {
    auth: (state = {}) => state,
    // Thêm các reducers khác nếu cần
  },
});

// Wrapper component
const HomePageWrapper = () => {
  return (
    <Provider store={mockStore}>
      <HomePage />
    </Provider>
  );
};

// Meta object - bắt buộc phải có cho Storybook
const meta = {
  title: "Pages/HomePage",
  component: HomePageWrapper,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ margin: "0", padding: "0" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof HomePageWrapper>;

// Default export - bắt buộc phải có
export default meta;
type Story = StoryObj<typeof meta>;

// Stories
export const Default: Story = {};

// Story với user đã đăng nhập
export const LoggedIn: Story = {
  parameters: {
    mockData: {
      auth: {
        isAuthenticated: true,
        user: {
          name: "Test User",
          email: "test@example.com",
        },
      },
    },
  },
};

// Story với loading state
export const Loading: Story = {
  parameters: {
    mockData: {
      loading: true,
    },
  },
};
