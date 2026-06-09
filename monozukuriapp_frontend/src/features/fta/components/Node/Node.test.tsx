import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "react-redux";
import Tree, { Type } from "./index";

jest.mock("../NodeComponent", () => {
  return function MockNodeComponent(props: any) {
    return (
      <div data-testid="node-component">
        <button onClick={() => props.addChild({ id: 2, name: "Child", level: 1, children: [] })}>Add Child</button>
        <button onClick={() => props.removeNode(2)}>Remove Node</button>
        <button onClick={() => props.updateTree({ id: 1, name: "Updated", level: 0, children: [] }, Type.USER)}>
          Update Node
        </button>
        <button onClick={props.resetRoot}>Reset</button>
      </div>
    );
  };
});

const createMockStore = (initialState: any) => ({
  getState: () => initialState,
  subscribe: jest.fn(),
  dispatch: jest.fn(),
  replaceReducer: jest.fn(),
  getActions: () => [],
  [Symbol.observable]: () => ({
    subscribe: jest.fn(),
    [Symbol.observable]: jest.fn(),
  }),
});

describe("Tree Component", () => {
  const mockProps = {
    root: {
      id: 1,
      name: "Root Node",
      level: 0,
      children: [],
    },
    maxNode: 6,
    setTreeNode: jest.fn(),
    isSubmittedRef: { current: false },
    handleFormChange: jest.fn(),
    queryIds: { current: [] },
  };

  let store: any;

  beforeEach(() => {
    store = createMockStore({
      submit: {
        isSubmitted: false,
      },
    });
    jest.clearAllMocks();
  });

  test("renders with initial root node", () => {
    render(
      <Provider store={store}>
        <Tree {...mockProps} />
      </Provider>,
    );
    expect(screen.getByTestId("node-component")).toBeInTheDocument();
  });

  test("handles adding child node", () => {
    render(
      <Provider store={store}>
        <Tree {...mockProps} />
      </Provider>,
    );

    const addButton = screen.getByText("Add Child");
    fireEvent.click(addButton);

    const actions = store.getActions();
    expect(actions).toEqual([]);
  });

  test("handles removing node", () => {
    const propsWithChild = {
      ...mockProps,
      root: {
        ...mockProps.root,
        children: [{ id: 2, name: "Child", level: 1, children: [] }],
      },
    };

    render(
      <Provider store={store}>
        <Tree {...propsWithChild} />
      </Provider>,
    );

    const removeButton = screen.getByText("Remove Node");
    fireEvent.click(removeButton);

    expect(mockProps.handleFormChange).toHaveBeenCalledWith("");
    expect(mockProps.isSubmittedRef.current).toBe(false);
  });

  test("handles updating node", () => {
    render(
      <Provider store={store}>
        <Tree {...mockProps} />
      </Provider>,
    );

    const updateButton = screen.getByText("Update Node");
    fireEvent.click(updateButton);

    const actions = store.getActions();
    expect(actions).toEqual([]);
  });

  test("handles resetting root", () => {
    render(
      <Provider store={store}>
        <Tree {...mockProps} />
      </Provider>,
    );

    const resetButton = screen.getByText("Reset");
    fireEvent.click(resetButton);

    expect(mockProps.handleFormChange).toHaveBeenCalledWith("");
    expect(mockProps.isSubmittedRef.current).toBe(false);
  });
});
