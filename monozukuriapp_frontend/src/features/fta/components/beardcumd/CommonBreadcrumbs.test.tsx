import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CommonBreadcrumbs from "./index";

describe("CommonBreadcrumbs", () => {
  const mockItems = [
    {
      label: "Home",
      onClick: jest.fn(),
    },
    {
      label: "Category",
      onClick: jest.fn(),
    },
    {
      label: "Current Page",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders all breadcrumb items", () => {
    const { getByText } = render(<CommonBreadcrumbs items={mockItems} />);

    mockItems.forEach((item) => {
      expect(getByText(item.label)).toBeInTheDocument();
    });
  });

  test("applies correct styles to clickable items", () => {
    const { getByText } = render(<CommonBreadcrumbs items={mockItems} />);
    const clickableItem = getByText("Home");

    expect(clickableItem).toHaveClass("cursor-pointer", "hover:text-[#007BFF]");
  });

  test("applies correct styles to non-clickable items", () => {
    const { getByText } = render(<CommonBreadcrumbs items={mockItems} />);
    const nonClickableItem = getByText("Current Page");

    expect(nonClickableItem).toHaveClass("no-underline", "text-inherit", "cursor-context-menu");
  });

  test("calls onClick handler when clicking on clickable items", () => {
    const { getByText } = render(<CommonBreadcrumbs items={mockItems} />);

    fireEvent.click(getByText("Home"));
    expect(mockItems[0].onClick).toHaveBeenCalledTimes(1);

    fireEvent.click(getByText("Category"));
    expect(mockItems[1].onClick).toHaveBeenCalledTimes(1);
  });

  test("renders with custom separator", () => {
    const customSeparator = <span data-testid="custom-separator">/</span>;
    const { getAllByTestId } = render(
      <CommonBreadcrumbs
        items={mockItems}
        separator={customSeparator}
      />,
    );

    const separators = getAllByTestId("custom-separator");
    expect(separators).toHaveLength(mockItems.length - 1);
  });

  test("renders with default separator when no separator prop is provided", () => {
    const { container } = render(<CommonBreadcrumbs items={mockItems} />);

    // NavigateNextIcon should be present
    const defaultSeparators = container.querySelectorAll(".MuiSvgIcon-root");
    expect(defaultSeparators).toHaveLength(mockItems.length - 1);
  });

  test("renders empty breadcrumbs when no items provided", () => {
    const { container } = render(<CommonBreadcrumbs items={[]} />);

    expect(container.querySelector(".MuiBreadcrumbs-root")).toBeInTheDocument();
    expect(container.querySelector(".MuiBreadcrumbs-ol")?.children).toHaveLength(0);
  });

  test("renders breadcrumbs with correct margin bottom", () => {
    const { container } = render(<CommonBreadcrumbs items={mockItems} />);

    expect(container.firstChild).toHaveClass("!mb-5");
  });

  test("handles items with both label and href", () => {
    const itemsWithHref = [
      {
        label: "Home",
        href: "/home",
        onClick: jest.fn(),
      },
      {
        label: "Current",
      },
    ];

    const { getByText } = render(<CommonBreadcrumbs items={itemsWithHref} />);
    const linkItem = getByText("Home");

    expect(linkItem).toHaveClass("cursor-pointer");
    fireEvent.click(linkItem);
    expect(itemsWithHref[0].onClick).toHaveBeenCalled();
  });
});
