import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TreeChart from "./index";

declare global {
  // eslint-disable-next-line no-var
  var Treant: jest.Mock;
}

global.Treant = jest.fn();

jest.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children }: any) => <div data-testid="transform-wrapper">{children}</div>,
  TransformComponent: ({ children }: any) => <div data-testid="transform-component">{children}</div>,
}));

describe("TreeChart Component", () => {
  const mockProps = {
    root: {
      name: "Root Node",
      level: 0,
      children: [],
    },
    selectedFont: "Arial",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = "";
  });

  test("renders zoom control buttons", () => {
    const { container } = render(<TreeChart {...mockProps} />);

    expect(container.querySelector('[aria-label="Zoom in"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Zoom out"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Reset zoom"]')).toBeInTheDocument();
  });

  test("renders transform components", () => {
    render(<TreeChart {...mockProps} />);

    expect(screen.getByTestId("transform-wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("transform-component")).toBeInTheDocument();
  });

  test("renders chart containers", () => {
    const { container } = render(<TreeChart {...mockProps} />);

    expect(container.querySelector("#treant-container")).toBeInTheDocument();
    expect(container.querySelector("#count_width")).toBeInTheDocument();
    expect(container.querySelector("#renderDownloadFTA")).toBeInTheDocument();
  });

  test("initializes Treant with correct config", () => {
    render(<TreeChart {...mockProps} />);

    expect(global.Treant).toHaveBeenCalledWith(
      expect.objectContaining({
        chart: expect.objectContaining({
          container: "#treant-container",
          rootOrientation: "WEST",
          nodeAlign: "BOTTOM",
          innerHTMLStyle: {
            fontFamily: "Arial",
          },
        }),
      }),
    );
  });

  test("applies selected font to containers", async () => {
    const { container } = render(<TreeChart {...mockProps} />);

    const svgContainer = container.querySelector("#count_width");
    expect(svgContainer).toHaveAttribute("style", expect.stringContaining("Arial"));

    expect(global.Treant).toHaveBeenCalledWith(
      expect.objectContaining({
        chart: expect.objectContaining({
          innerHTMLStyle: {
            fontFamily: "Arial",
          },
        }),
      }),
    );
  });
});
