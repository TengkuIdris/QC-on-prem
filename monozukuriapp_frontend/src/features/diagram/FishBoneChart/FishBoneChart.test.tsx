import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import FishboneChartComponent from "./index";
import { FontSize } from "@/components/chart/GeneralFishboneChart/enums";
import * as computeDimensions from "../utils/fishbone/compute-dimensions";
import * as renderFishBone from "../utils/fishbone/renderFishBone";

// Mock the utility functions
jest.mock("../utils/fishbone/compute-dimensions", () => ({
  handleGenerateJsonCoordinates: jest.fn(),
}));

jest.mock("../utils/fishbone/renderFishBone", () => ({
  countSizeText: jest.fn().mockReturnValue({ width: 100, height: 50 }),
  createFishboneDiagram: jest.fn(),
  handleGetHeightLineText: jest.fn().mockReturnValue(16),
}));

describe("FishboneChartComponent", () => {
  const mockRoot = {
    name: "Root",
    level: 0,
    children: [
      {
        name: "Child 1",
        level: 1,
        children: [],
      },
      {
        name: "Child 2",
        level: 2,
        children: [],
      },
    ],
  };

  const defaultProps = {
    selectedFont: "Arial",
    divRef: React.createRef<HTMLDivElement>(),
    root: mockRoot,
    rootFontSize: FontSize._16px,
    firstChildFontSize: FontSize._14px,
    otherChildFontSize: FontSize._12px,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders without crashing", () => {
    render(<FishboneChartComponent {...defaultProps} />);
    const diagram = document.getElementById("diagram");
    expect(diagram).toBeInTheDocument();
  });

  test("renders with correct container classes", () => {
    render(<FishboneChartComponent {...defaultProps} />);
    const container = document.getElementById("diagram");
    expect(container).toHaveClass(
      "px-5",
      "relative",
      "h-full",
      "w-full",
      "flex",
      "item-center",
      "justify-center",
      "items-center",
    );
  });

  test("calls diagram generation functions with correct parameters", () => {
    render(<FishboneChartComponent {...defaultProps} />);

    expect(renderFishBone.handleGetHeightLineText).toHaveBeenCalledWith(
      defaultProps.selectedFont,
      defaultProps.firstChildFontSize,
    );
    expect(renderFishBone.handleGetHeightLineText).toHaveBeenCalledWith(
      defaultProps.selectedFont,
      defaultProps.otherChildFontSize,
    );
    expect(computeDimensions.handleGenerateJsonCoordinates).toHaveBeenCalled();
    expect(renderFishBone.createFishboneDiagram).toHaveBeenCalledWith(
      expect.any(Object),
      defaultProps.selectedFont,
      defaultProps.rootFontSize,
      defaultProps.firstChildFontSize,
      defaultProps.otherChildFontSize,
      expect.any(Number),
      expect.any(Number),
    );
  });

  test("updates diagram when props change", () => {
    const { rerender } = render(<FishboneChartComponent {...defaultProps} />);

    const updatedProps = {
      ...defaultProps,
      selectedFont: "Times New Roman",
      rootFontSize: FontSize._20px,
    };

    rerender(<FishboneChartComponent {...updatedProps} />);

    expect(renderFishBone.createFishboneDiagram).toHaveBeenCalledTimes(2);
  });

  test("handles empty root data", () => {
    const propsWithoutRoot = {
      ...defaultProps,
      root: undefined,
    };

    render(<FishboneChartComponent {...propsWithoutRoot} />);

    const diagram = document.getElementById("diagram");
    expect(diagram).toBeInTheDocument();
    expect(renderFishBone.handleGetHeightLineText).not.toHaveBeenCalled();
    expect(renderFishBone.createFishboneDiagram).not.toHaveBeenCalled();
    expect(computeDimensions.handleGenerateJsonCoordinates).not.toHaveBeenCalled();
  });

  test("uses default font sizes when not provided", () => {
    const propsWithoutFontSizes = {
      selectedFont: "Arial",
      divRef: React.createRef<HTMLDivElement>(),
      root: mockRoot,
    };

    render(<FishboneChartComponent {...propsWithoutFontSizes} />);

    expect(renderFishBone.createFishboneDiagram).toHaveBeenCalledWith(
      expect.any(Object),
      "Arial",
      FontSize._16px,
      FontSize._12px,
      FontSize._12px,
      expect.any(Number),
      expect.any(Number),
    );
  });

  test("handles data transformation correctly", () => {
    render(<FishboneChartComponent {...defaultProps} />);

    expect(computeDimensions.handleGenerateJsonCoordinates).toHaveBeenCalledWith(
      expect.objectContaining({
        fontSize: FontSize._16px,
        fontFamily: "Arial",
        name: mockRoot.name,
        level: mockRoot.level,
        children: expect.any(Array),
      }),
    );
  });
});
