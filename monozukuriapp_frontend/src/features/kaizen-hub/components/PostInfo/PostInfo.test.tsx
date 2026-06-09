import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PostInfo } from "./index";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/enum/pathnames";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("date-fns", () => ({
  format: jest.fn().mockReturnValue("2024/03/20"),
}));

describe("PostInfo", () => {
  const defaultProps = {
    title: "Test Title",
    postDate: "2024-03-20",
    desc: "Test Description",
    id: 1,
  };

  const renderPostInfo = (props = {}) => {
    return render(
      <BrowserRouter>
        <PostInfo
          {...defaultProps}
          {...props}
        />
      </BrowserRouter>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders basic post info correctly", () => {
    renderPostInfo();

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("2024/03/20 - Test Description")).toBeInTheDocument();
  });

  test("navigates to correct path when title is clicked with linkPath", () => {
    renderPostInfo({ linkPath: App.KAIZEN_HUB_INFO, isView: true });

    fireEvent.click(screen.getByText("Test Title"));

    expect(mockNavigate).toHaveBeenCalledWith(`${App.KAIZEN_HUB_INFO}/1`, { state: { isView: true } });
  });

  test("navigates to search path when title is clicked without linkPath", () => {
    renderPostInfo();

    fireEvent.click(screen.getByText("Test Title"));

    expect(mockNavigate).toHaveBeenCalledWith(`${App.KAIZEN_HUB_SEARCH}/1`, { state: { isView: undefined } });
  });

  test("renders like count and thumbs up icon when isShow is true", () => {
    renderPostInfo({ like: 10, isShow: true });

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByTestId("thumbs-up-icon")).toBeInTheDocument();
  });

  test("does not render like count when isShow is false", () => {
    renderPostInfo({ like: 10, isShow: false });

    expect(screen.queryByTestId("thumbs-up")).not.toBeInTheDocument();
  });

  test("renders rating component when isRating is true", () => {
    renderPostInfo({ rating: 4.5, isRating: true });

    const ratingElement = screen.getByRole("img", { name: /4.5 Stars/i });
    expect(ratingElement).toBeInTheDocument();
  });

  test("does not render rating component when isRating is false", () => {
    renderPostInfo({ rating: 4.5, isRating: false });

    const ratingElement = screen.queryByRole("img", { name: /4.5 Stars/i });
    expect(ratingElement).not.toBeInTheDocument();
  });

  test("shows tooltips on hover", async () => {
    renderPostInfo();

    const titleElement = screen.getByText("Test Title");
    fireEvent.mouseOver(titleElement);

    expect(await screen.findByRole("tooltip", { name: "Test Title" })).toBeInTheDocument();

    const descElement = screen.getByText("2024/03/20 - Test Description");
    fireEvent.mouseOver(descElement);

    expect(await screen.findByRole("tooltip", { name: "Test Description" })).toBeInTheDocument();
  });
});
