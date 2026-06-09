import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import DotAnimation from "./index";

describe("DotAnimation Component", () => {
  test("renders three dots", () => {
    const { container } = render(<DotAnimation />);
    const dots = container.querySelectorAll(".MuiBox-root");
    // 1 container + 3 dots = 4 Box elements
    expect(dots).toHaveLength(4);
  });

  test("renders with correct container styles", () => {
    const { container } = render(<DotAnimation />);
    const containerBox = container.firstChild;

    expect(containerBox).toHaveStyle({
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });
  });

  test("each dot has correct base styles", () => {
    const { container } = render(<DotAnimation />);
    const dots = container.querySelectorAll(".MuiBox-root");

    // Skip the first element (container)
    Array.from(dots)
      .slice(1)
      .forEach((dot) => {
        expect(dot).toHaveStyle({
          width: "10px",
          height: "10px",
          borderRadius: "50%",
        });
      });
  });

  test("dots have different animation delays", () => {
    const { container } = render(<DotAnimation />);
    const dots = Array.from(container.querySelectorAll(".MuiBox-root")).slice(1);

    expect(dots[0]).toHaveStyle({ animationDelay: "0s" });
    expect(dots[1]).toHaveStyle({ animationDelay: "0.2s" });
    expect(dots[2]).toHaveStyle({ animationDelay: "0.4s" });
  });

  test("dots have bounce animation", () => {
    const { container } = render(<DotAnimation />);
    const dots = Array.from(container.querySelectorAll(".MuiBox-root")).slice(1);

    dots.forEach((dot) => {
      expect(dot).toHaveStyle({
        animation: "bounce 1.5s infinite",
      });
    });
  });

  test("container has correct gap between dots", () => {
    const { container } = render(<DotAnimation />);
    const containerBox = container.firstChild;

    expect(containerBox).toHaveStyle({
      gap: "4px",
    });
  });

  test("dots have primary color background", () => {
    const { container } = render(<DotAnimation />);
    const dots = Array.from(container.querySelectorAll(".MuiBox-root")).slice(1);

    dots.forEach((dot) => {
      // MUI primary color is applied through sx prop
      expect(dot).toHaveStyle({
        backgroundColor: "primary.main",
      });
    });
  });

  test("component renders without crashing", () => {
    expect(() => render(<DotAnimation />)).not.toThrow();
  });
});
