import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ImprovementDetails, { ImprovementDetailsProps } from "./index";
import { ILabelImprovement } from "@/interfaces";

describe("ImprovementDetails Component", () => {
  const mockLabels = [
    {
      label: {
        id: 1,
        title: "Tool 1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    {
      label: {
        id: 2,
        title: "Tool 2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  const mockTipsAndTricks = "Tip 1\nTip 2\nTip 3";

  const renderImprovementDetails = (
    props: ImprovementDetailsProps = { labels: mockLabels, tipsAndTricks: mockTipsAndTricks },
  ) => {
    return render(<ImprovementDetails {...props} />);
  };

  describe("Headers", () => {
    test("should render section headers", () => {
      renderImprovementDetails();

      expect(screen.getByText("改善ポイント")).toBeInTheDocument();
      expect(screen.getByText("使用ツール・技法")).toBeInTheDocument();
    });
  });

  describe("Tips and Tricks Section", () => {
    test("should render tips and tricks when provided", () => {
      renderImprovementDetails();

      expect(screen.getByText("Tip 1")).toBeInTheDocument();
      expect(screen.getByText("Tip 2")).toBeInTheDocument();
      expect(screen.getByText("Tip 3")).toBeInTheDocument();
    });

    test("should handle single line tip", () => {
      renderImprovementDetails({ labels: mockLabels, tipsAndTricks: "Single Tip" });

      expect(screen.getByText("Single Tip")).toBeInTheDocument();
    });
  });

  describe("Labels Section", () => {
    test("should render all labels when provided", () => {
      renderImprovementDetails();

      expect(screen.getByText("Tool 1")).toBeInTheDocument();
      expect(screen.getByText("Tool 2")).toBeInTheDocument();
    });

    test("should not render labels list when labels array is empty", () => {
      renderImprovementDetails({ labels: [], tipsAndTricks: mockTipsAndTricks });

      const labelsList = screen.queryByRole("list", { name: /使用ツール・技法/i });
      expect(labelsList).not.toBeInTheDocument();
    });

    test("should handle undefined label title", () => {
      const labelsWithUndefined: ILabelImprovement[] = [
        {
          label: {
            id: 1,
            title: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      ];

      expect(() =>
        renderImprovementDetails({ labels: labelsWithUndefined, tipsAndTricks: mockTipsAndTricks }),
      ).not.toThrow();
    });
  });

  describe("Layout and Styling", () => {
    test("should apply correct typography variant to headers", () => {
      renderImprovementDetails();

      const headers = screen.getAllByRole("heading", { level: 6 });
      headers.forEach((header) => {
        expect(header).toHaveClass("!font-bold");
        expect(header).toHaveClass("!mb-[8px]");
      });
    });

    test("should apply list styling", () => {
      renderImprovementDetails();

      const lists = screen.getAllByRole("list");
      lists.forEach((list) => {
        expect(list).toHaveClass("list-none");
        expect(list).toHaveClass("pl-5");
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle missing props gracefully", () => {
      expect(() =>
        render(
          <ImprovementDetails
            labels={[]}
            tipsAndTricks=""
          />,
        ),
      ).not.toThrow();
    });

    test("should handle malformed tips string", () => {
      const malformedTips = "Tip 1\n\nTip 2\n\n\nTip 3";
      renderImprovementDetails({ labels: mockLabels, tipsAndTricks: malformedTips });

      expect(screen.getByText("Tip 1")).toBeInTheDocument();
      expect(screen.getByText("Tip 2")).toBeInTheDocument();
      expect(screen.getByText("Tip 3")).toBeInTheDocument();
    });
  });
});
