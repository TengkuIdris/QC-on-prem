import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import NodeForm from "./index";
import { FTANode, GateType } from "../../types/ftaTypes";

jest.mock("react-dnd", () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{}, jest.fn()],
}));

jest.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: {},
}));

jest.mock(
  "@mui/material/Portal",
  () =>
    ({ children }: { children: React.ReactNode }) =>
      children,
);

describe("NodeForm Component", () => {
  const mockNode: FTANode = {
    id: "1",
    content: "Test Node",
    depth: 0,
    gateType: "BASIC" as GateType,
    children: [],
    comment: "",
    name: "",
    type: "",
  };

  const defaultProps = {
    node: mockNode,
    onUpdate: jest.fn(),
    onAddChild: jest.fn(),
    onRemove: jest.fn(),
    onMove: jest.fn(),
    onDuplicate: jest.fn(),
    onAddComment: jest.fn(),
    searchTerm: "",
    selectedNodes: [],
    onSelectNode: jest.fn(),
    collapsedNodes: [],
    onToggleCollapse: jest.fn(),
    zoom: 1,
  };

  const renderComponent = (props = defaultProps) => {
    return render(<NodeForm {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders basic node content", () => {
    renderComponent();
    expect(screen.getByDisplayValue("Test Node")).toBeInTheDocument();
    expect(screen.getByDisplayValue("BASIC")).toBeInTheDocument();
  });

  test("handles content change", () => {
    renderComponent();
    const input = screen.getByDisplayValue("Test Node");
    fireEvent.change(input, { target: { value: "Updated Content" } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({
      ...mockNode,
      content: "Updated Content",
    });
  });

  test("handles add child button click", () => {
    renderComponent();
    const addButton = screen.getByLabelText("Add child node (Ctrl+Enter)");
    fireEvent.click(addButton);
    expect(defaultProps.onAddChild).toHaveBeenCalledWith(mockNode.id);
  });

  test("handles remove node button click", () => {
    renderComponent();
    const removeButton = screen.getByLabelText("Remove node (Ctrl+Backspace)");
    fireEvent.click(removeButton);
    expect(defaultProps.onRemove).toHaveBeenCalledWith(mockNode.id);
  });

  test("handles duplicate node button click", () => {
    renderComponent();
    const duplicateButton = screen.getByLabelText("Duplicate node (Ctrl+D)");
    fireEvent.click(duplicateButton);
    expect(defaultProps.onDuplicate).toHaveBeenCalledWith(mockNode.id);
  });

  test("handles comment dialog", () => {
    renderComponent();

    const commentButton = screen.getByLabelText("Add comment");
    fireEvent.click(commentButton);

    const commentInput = screen.getByLabelText("Comment");
    fireEvent.change(commentInput, { target: { value: "Test Comment" } });

    const submitButton = screen.getByText("Submit");
    fireEvent.click(submitButton);

    expect(defaultProps.onAddComment).toHaveBeenCalledWith(mockNode.id, "Test Comment");
  });

  test("handles node selection", () => {
    renderComponent();
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(defaultProps.onSelectNode).toHaveBeenCalledWith(mockNode.id, true);
  });

  test("highlights node when search term matches", () => {
    const propsWithSearch = {
      ...defaultProps,
      searchTerm: "test",
    };
    renderComponent(propsWithSearch);
    const paper = screen.getByTestId("node-paper");
    expect(paper).toHaveStyle({ backgroundColor: "yellow" });
  });

  test("shows collapse/expand button for nodes with children", () => {
    const nodeWithChildren: FTANode = {
      ...mockNode,
      children: [
        {
          id: "2",
          content: "Child Node",
          depth: 1,
          gateType: "BASIC" as GateType,
          children: [],
          comment: "",
          name: "",
          type: "",
        },
      ],
    };
    renderComponent({ ...defaultProps, node: nodeWithChildren });
    expect(screen.getByTestId("collapse-expand-button")).toBeInTheDocument();
  });

  test("applies correct zoom transformation", () => {
    const propsWithZoom = {
      ...defaultProps,
      zoom: 1.5,
    };
    renderComponent(propsWithZoom);
    const paper = screen.getByTestId("node-paper");
    expect(paper).toHaveStyle({ transform: "scale(1.5)" });
  });

  test("root node doesn't show remove button", () => {
    const rootNode = {
      ...mockNode,
      id: "root",
    };
    renderComponent({ ...defaultProps, node: rootNode });
    expect(screen.queryByTitle("Remove node (Ctrl+Backspace)")).not.toBeInTheDocument();
  });
});
